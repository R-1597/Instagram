$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:5000/api"
$tempImage = Join-Path $env:TEMP "social-app-upload-test.png"

try {
    # 1. Login automatically (only account credentials are requested)
    $email = Read-Host "Test account email"
    $securePassword = Read-Host "Test account password" -AsSecureString
    $password = [System.Net.NetworkCredential]::new("", $securePassword).Password

    $body = @{
        email = $email
        password = $password
    } | ConvertTo-Json

    $login = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method POST -ContentType "application/json" -Body $body

    $token = $login.accessToken
    if (-not $token) { throw "Login response did not contain accessToken." }
    Write-Host "PASS: Login successful" -ForegroundColor Green

    # 2. Create a tiny valid PNG automatically
    $pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
    [IO.File]::WriteAllBytes($tempImage, [Convert]::FromBase64String($pngBase64))
    Write-Host "PASS: Test image generated" -ForegroundColor Green

    # 3. Upload multipart/form-data using .NET (works without -Form)
    Add-Type -AssemblyName System.Net.Http
    $client = [System.Net.Http.HttpClient]::new()
    $client.DefaultRequestHeaders.Authorization =
        [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $token)

    $multipart = [System.Net.Http.MultipartFormDataContent]::new()
    $fileBytes = [IO.File]::ReadAllBytes($tempImage)
    $fileContent = [System.Net.Http.ByteArrayContent]::new($fileBytes)
    $fileContent.Headers.ContentType =
        [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("image/png")
    $multipart.Add($fileContent, "image", "upload-test.png")

    $response = $client.PostAsync("$baseUrl/posts/uploads/image", $multipart).GetAwaiter().GetResult()
    $responseText = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()

    if (-not $response.IsSuccessStatusCode) {
        throw "Upload failed: HTTP $([int]$response.StatusCode) - $responseText"
    }

    $result = $responseText | ConvertFrom-Json
    if (-not $result.media.url -or -not $result.media.publicId) {
        throw "Upload response is missing media.url or media.publicId."
    }

    Write-Host "PASS: Cloudinary upload successful" -ForegroundColor Green
    Write-Host "Uploaded URL: $($result.media.url)"
    Write-Host "Public ID: $($result.media.publicId)"
}
catch {
    Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
}
finally {
    if ($client) { $client.Dispose() }
    if ($multipart) { $multipart.Dispose() }
    if (Test-Path $tempImage) { Remove-Item $tempImage -Force }
    $password = $null
    $securePassword = $null
}
