$email = Read-Host "Enter user email"
$securePassword = Read-Host "Enter password" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)

    $body = @{
        email    = $email
        password = $password
    } | ConvertTo-Json

    $response = Invoke-RestMethod `
        -Uri "http://localhost:5000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body

    Write-Host "`nLogin successful!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10

    $token = $response.accessToken
    if (-not $token) { $token = $response.token }

    if ($token) {
        Set-Clipboard -Value $token
        Write-Host "`nAccess token copied to clipboard." -ForegroundColor Cyan
    }

    if ($response.user._id) {
        Write-Host "User ID: $($response.user._id)" -ForegroundColor Cyan
    }
}
catch {
    Write-Host "`nLogin failed." -ForegroundColor Red
    Write-Host $_.Exception.Message

    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    }
}
finally {
    if ($bstr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
    $password = $null
    $body = $null
}
