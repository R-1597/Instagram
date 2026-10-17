
$baseUrl = "http://localhost:5000/api/posts"
$postId = Read-Host "Enter a valid Post ID"

# Test 1: Public guest request
try {
    $guest = Invoke-RestMethod `
        -Uri "$baseUrl/$postId" `
        -Method Get

    if ($null -eq $guest.post.likeCount) {
        throw "Guest response is missing likeCount"
    }

    if ($guest.post.isLikedByMe -ne $false) {
        throw "Guest isLikedByMe should be false"
    }

    Write-Host "PASS: Guest can view post and like count." -ForegroundColor Green
}
catch {
    Write-Host "FAIL: Guest test - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    }
    return
}

# Test 2: Authenticated request
$email = Read-Host "Enter your account email"
$securePassword = Read-Host "Enter your password" -AsSecureString
$credential = [System.Net.NetworkCredential]::new("", $securePassword)
$password = $credential.Password

try {
    $loginBody = @{
        email    = $email
        password = $password
    } | ConvertTo-Json

    $login = Invoke-RestMethod `
        -Uri "http://localhost:5000/api/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody

    $token = $login.token
    if (-not $token) { $token = $login.accessToken }
    if (-not $token) { $token = $login.data.token }
    if (-not $token) { $token = $login.data.accessToken }

    if (-not $token) {
        throw "Login succeeded but no token was found. Check your login response format."
    }

    $headers = @{
        Authorization = "Bearer $token"
    }

    $authenticated = Invoke-RestMethod `
        -Uri "$baseUrl/$postId" `
        -Method Get `
        -Headers $headers

    if ($null -eq $authenticated.post.likeCount) {
        throw "Authenticated response is missing likeCount"
    }

    if ($authenticated.post.isLikedByMe -isnot [bool]) {
        throw "isLikedByMe must be a Boolean"
    }

    Write-Host "PASS: Authenticated request returned like status." -ForegroundColor Green
    Write-Host "likeCount: $($authenticated.post.likeCount)"
    Write-Host "isLikedByMe: $($authenticated.post.isLikedByMe)"
}
catch {
    Write-Host "FAIL: Authenticated test - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    }
}
finally {
    $password = $null
    $credential = $null
    $securePassword = $null
}
