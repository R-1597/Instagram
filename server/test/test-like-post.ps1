
$baseUrl = "http://localhost:5000/api"

$email = Read-Host "Test account email"
$securePassword = Read-Host "Password" -AsSecureString

$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
    $securePassword
)

try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}

try {
    $loginBody = @{
        email = $email
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
        throw "Login succeeded but no token was found."
    }

    Write-Host "PASS: Login successful." -ForegroundColor Green

    $postId = Read-Host "Enter an existing post ID"

    if ($postId -notmatch '^[a-fA-F0-9]{24}$') {
        throw "Invalid MongoDB post ID."
    }

    $headers = @{
        Authorization = "Bearer $token"
    }

    $uri = "$baseUrl/posts/$postId/like"

    # First like
    $first = Invoke-RestMethod `
        -Uri $uri `
        -Method POST `
        -Headers $headers

    if ($first.success -and $first.liked -eq $true) {
        Write-Host "PASS: First like succeeded." -ForegroundColor Green
    }
    else {
        throw "First like returned an unexpected response."
    }

    # Repeat the like: should not create a duplicate
    $second = Invoke-RestMethod `
        -Uri $uri `
        -Method POST `
        -Headers $headers

    if ($second.success -and $second.liked -eq $true) {
        Write-Host "PASS: Repeated like handled safely." -ForegroundColor Green
    }
    else {
        throw "Repeated like returned an unexpected response."
    }

    Write-Host "`nFirst response:"
    $first | ConvertTo-Json -Depth 5

    Write-Host "`nSecond response:"
    $second | ConvertTo-Json -Depth 5
}
catch {
    Write-Host "`nTEST FAILED: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    }

    if ($_.Exception.Response) {
        Write-Host "HTTP Status: $([int]$_.Exception.Response.StatusCode)"
    }
}
finally {
    $password = $null
    $token = $null
}
