
$baseUrl = "http://localhost:5000"

# Account B credentials
$loginBody = @{
    email    = "followtestb@example.com"
    password = "TestPass123!Secure"
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

    if ($token) {
        Write-Host "PASS: Account B login successful." -ForegroundColor Green
        Write-Host "Access token received. Length: $($token.Length)"

        # Keep the token available in this PowerShell session
        $global:accountBToken = $token
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
