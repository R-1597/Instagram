```powershell
# Login and delete a post in one go

$baseUrl = "http://localhost:5000/api"
$postId = "6ad22b607a6a56342bab0ba8"

# Account credentials
$email = "followtesta@example.com"
$username = "follow_test_a"
$password = Read-Host "Enter account password"

# Step 1: Login and get access token
$loginBody = @{
    username = $username
    email    = $email
    password = $password
} | ConvertTo-Json

try {
    Write-Host "`nLogging in..." -ForegroundColor Cyan

    $loginResponse = Invoke-RestMethod `
        -Uri "$baseUrl/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    # Support common token response formats
    $token = $loginResponse.accessToken
    if (-not $token) { $token = $loginResponse.token }
    if (-not $token) { $token = $loginResponse.data.accessToken }
    if (-not $token) { $token = $loginResponse.data.token }

    if (-not $token) {
        Write-Host "Login response did not contain a recognized token field." -ForegroundColor Red
        Write-Host ($loginResponse | ConvertTo-Json -Depth 10)
        exit 1
    }

    # Copy token to clipboard for reuse
    Set-Clipboard -Value $token
    Write-Host "Login successful. Access token copied to clipboard." -ForegroundColor Green

    # Step 2: Delete the post
    $headers = @{
        Authorization = "Bearer $token"
    }

    Write-Host "`nDeleting post $postId ..." -ForegroundColor Cyan

    $deleteResponse = Invoke-RestMethod `
        -Uri "$baseUrl/posts/$postId" `
        -Method DELETE `
        -Headers $headers

    Write-Host "`nDELETE request succeeded:" -ForegroundColor Green
    $deleteResponse | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "`nRequest failed." -ForegroundColor Red

    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    }
    else {
        Write-Host $_.Exception.Message
    }

    Write-Host "`nCheck that the server is running, the login fields match your API, and this account owns the post." -ForegroundColor Yellow
}
```