
$baseUrl = "http://localhost:5000"

# Enter the post ID you want to test
$postId = Read-Host "Enter the post ID"

# Login
$email = Read-Host "Enter your login email"
$securePassword = Read-Host "Enter your password" -AsSecureString
$credential = [System.Net.NetworkCredential]::new("", $securePassword)
$password = $credential.Password

$loginBody = @{
    email    = $email
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    $token = $loginResponse.token

    if (-not $token) {
        $token = $loginResponse.accessToken
    }
    if (-not $token) {
        $token = $loginResponse.data.token
    }
    if (-not $token) {
        $token = $loginResponse.data.accessToken
    }

    if (-not $token) {
        throw "Login succeeded, but no JWT token was found in the response."
    }

    Write-Host "`nLogin successful." -ForegroundColor Green
}
catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Delete the specified post
try {
    $response = Invoke-RestMethod `
        -Uri "$baseUrl/api/posts/$postId" `
        -Method DELETE `
        -Headers @{ Authorization = "Bearer $token" }

    Write-Host "`nDelete response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "`nDelete request failed." -ForegroundColor Red

    if ($_.Exception.Response) {
        Write-Host "HTTP Status: $([int]$_.Exception.Response.StatusCode)"

        $reader = New-Object System.IO.StreamReader(
            $_.Exception.Response.GetResponseStream()
        )
        Write-Host $reader.ReadToEnd()
        $reader.Dispose()
    }
    else {
        Write-Host $_.Exception.Message
    }
}
