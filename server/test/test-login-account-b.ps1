```powershell
$baseUrl = "http://localhost:5000"

# Account B credentials
$loginBody = @{
    email    = "followtestb@example.com"
    password = "TestPass123!Secure"

    # email    = "loki@gmail.com"
    # password = "123456789"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod `
        -Uri "$baseUrl/api/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody

    $token = $response.accessToken

    if (-not $token) {
        $token = $response.token
    }

    if (-not $token) {
        $token = $response.data.accessToken
    }

    if (-not $token) {
        $token = $response.data.token
    }

    if ($token) {
        Write-Host "`nPASS: Account B login successful." -ForegroundColor Green

        # Display the token so you can copy it
        Write-Host "`nAccess Token:" -ForegroundColor Cyan
        Write-Host $token

        # Copy the token to the clipboard
        Set-Clipboard -Value $token

        Write-Host "`nPASS: Token copied to clipboard." -ForegroundColor Green
        Write-Host "Paste it wherever needed using Ctrl+V."
    }
    else {
        Write-Host "FAIL: Login response contains no access token." -ForegroundColor Red
        $response | ConvertTo-Json -Depth 5
    }
}
catch {
    Write-Host "FAIL: Account B login failed." -ForegroundColor Red

    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    }
    else {
        Write-Host $_.Exception.Message
    }
}
```