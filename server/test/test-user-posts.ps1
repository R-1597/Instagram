
# Stage 9: Get User Posts API Test
# Compatible with Windows PowerShell 5.1

$baseUrl = "http://localhost:5000/api"

Write-Host "`n=== Testing GET /api/posts/user/:userId ===" -ForegroundColor Cyan

# Login
$email = Read-Host "Enter test account email"
$securePassword = Read-Host "Enter password" -AsSecureString

$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}

try {
    $loginBody = @{
        email    = $email
        password = $password
    } | ConvertTo-Json

    $login = Invoke-RestMethod `
        -Uri "$baseUrl/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    $token = $login.token
    if (-not $token) { $token = $login.accessToken }
    if (-not $token) { $token = $login.data.token }
    if (-not $token) { $token = $login.data.accessToken }

    if (-not $token) {
        throw "No JWT found in login response."
    }

    Write-Host "PASS: Login successful; fresh token obtained." -ForegroundColor Green

    $headers = @{
        Authorization = "Bearer $token"
    }

    # Get user ID from a post you own, or enter it manually
    $userId = Read-Host "Enter the user's MongoDB ID (24 hexadecimal characters)"

    if ($userId -notmatch '^[a-fA-F0-9]{24}$') {
        throw "Invalid user ID."
    }

    # Request first page
    $page = 1
    $limit = 10
    $uri = "$baseUrl/posts/user/$userId`?page=$page&limit=$limit"

    $result = Invoke-RestMethod `
        -Uri $uri `
        -Method GET `
        -Headers $headers

    if ($null -ne $result.success -and $result.success -eq $false) {
    Write-Host "`nAPI returned an unsuccessful response:" -ForegroundColor Red
    $result | ConvertTo-Json -Depth 10
    throw "API returned success=false."
}

if ($null -eq $result.posts) {
    throw "Response does not contain the expected posts array."
}

Write-Host "PASS: User posts endpoint returned a valid response." -ForegroundColor Green

if ($result.posts.Count -eq 0) {
    Write-Host "INFO: No posts found for this user. Empty results are valid." -ForegroundColor Yellow
}

    Write-Host "PASS: User posts endpoint returned success=true." -ForegroundColor Green

    # Display response summary
    Write-Host "`n--- Pagination ---" -ForegroundColor Cyan
    $result.pagination | Format-List

    # Support common response shapes
    $posts = $result.posts
    if ($null -eq $posts) { $posts = $result.data.posts }
    if ($null -eq $posts) { $posts = $result.data }

    if ($null -eq $posts -or $posts -isnot [array]) {
        throw "Could not find a posts array. Inspect the API response shape."
    }

    Write-Host "`nPosts returned: $($posts.Count)" -ForegroundColor Yellow

    # Display posts
    $posts |
        Select-Object _id, caption, createdAt |
        Format-Table -AutoSize

    # Check newest-first ordering
    $dates = @(
        $posts | ForEach-Object {
            if ($_.createdAt) {
                [DateTimeOffset]::Parse($_.createdAt).ToUnixTimeMilliseconds()
            }
        }
    )

    $sorted = $true
    for ($i = 1; $i -lt $dates.Count; $i++) {
        if ($dates[$i] -gt $dates[$i - 1]) {
            $sorted = $false
            break
        }
    }

    if ($sorted) {
        Write-Host "PASS: Posts are sorted newest first." -ForegroundColor Green
    }
    else {
        Write-Host "FAIL: Posts are not sorted newest first." -ForegroundColor Red
    }

    # Check requested page size
    if ($posts.Count -le $limit) {
        Write-Host "PASS: Returned posts do not exceed limit=$limit." -ForegroundColor Green
    }
    else {
        Write-Host "FAIL: More posts returned than the requested limit." -ForegroundColor Red
    }

    # Check author information when populated
    if ($posts.Count -gt 0 -and $posts[0].author) {
        Write-Host "PASS: Post author information is populated." -ForegroundColor Green
    }
    else {
        Write-Host "INFO: No posts returned, or author is not populated." -ForegroundColor Yellow
    }

    # Try page 2 to check pagination parameters are accepted
    $page2Uri = "$baseUrl/posts/user/$userId`?page=2&limit=$limit"

    $page2 = Invoke-RestMethod `
        -Uri $page2Uri `
        -Method GET `
        -Headers $headers

    if ($page2.success) {
        Write-Host "PASS: Page 2 request succeeded." -ForegroundColor Green
    }
    else {
        Write-Host "FAIL: Page 2 request returned success=false." -ForegroundColor Red
    }

    Write-Host "`n=== User Posts API Test Finished ===" -ForegroundColor Cyan
}
catch {
    Write-Host "`nTEST FAILED: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.Exception.Response) {
        Write-Host "HTTP Status: $([int]$_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}
finally {
    $password = $null
    $token = $null
}
