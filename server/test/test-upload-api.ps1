
$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:5000"

try {
    # 1. Get login credentials securely
    $email = Read-Host "Enter your test account email"
    $securePassword = Read-Host "Enter your password" -AsSecureString
    $credential = [System.Net.NetworkCredential]::new("", $securePassword)
    $password = $credential.Password

    # 2. Login and obtain JWT automatically
    Write-Host "`n[1/3] Logging in..." -ForegroundColor Cyan

    $loginBody = @{
        email    = $email
        password = $password
    } | ConvertTo-Json

    $login = Invoke-RestMethod `
        -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    # Support common JWT response shapes
    $token = $login.token
    if (-not $token) { $token = $login.accessToken }
    if (-not $token) { $token = $login.data.token }
    if (-not $token) { $token = $login.data.accessToken }

    if (-not $token) {
        throw "Login succeeded, but no token was found. Check the login response structure."
    }

    Write-Host "PASS: Login successful; JWT obtained." -ForegroundColor Green

    # 3. Generate a tiny PNG in memory and upload it
    Write-Host "`n[2/3] Generating test image..." -ForegroundColor Cyan

    $pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
    $imageBytes = [Convert]::FromBase64String($pngBase64)

    
    
    # PowerShell 5.1-compatible multipart upload
    Add-Type -AssemblyName System.Net.Http

    $tempImage = Join-Path $env:TEMP "nearme-test-upload.png"
    [System.IO.File]::WriteAllBytes($tempImage, $imageBytes)

    $client = New-Object System.Net.Http.HttpClient
    $multipart = New-Object System.Net.Http.MultipartFormDataContent

    try {
        $client.DefaultRequestHeaders.Authorization =
            New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $token)

        $fileStream = [System.IO.File]::OpenRead($tempImage)
        $imageContent = New-Object System.Net.Http.StreamContent($fileStream)
        $imageContent.Headers.ContentType =
            New-Object System.Net.Http.Headers.MediaTypeHeaderValue("image/png")

        $multipart.Add($imageContent, "image", "test-upload.png")

        Write-Host "`n[3/3] Uploading image through Express..." -ForegroundColor Cyan

        $response = $client.PostAsync(
            "$baseUrl/api/posts/uploads/image",
            $multipart
        ).GetAwaiter().GetResult()

        $responseText = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()

        if (-not $response.IsSuccessStatusCode) {
            throw "Upload returned HTTP $([int]$response.StatusCode): $responseText"
        }

        $result = $responseText | ConvertFrom-Json

        Write-Host "`nPASS: Upload API succeeded." -ForegroundColor Green
        $result | ConvertTo-Json -Depth 10

        
    # Stage 9.6: Create a post using the uploaded image
    Write-Host "`n[4/4] Creating post with uploaded image..." -ForegroundColor Cyan

    $postBody = @{
        caption = "Testing image upload and post creation"
        media   = @($result.media)
    } | ConvertTo-Json -Depth 10

    $postResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/posts" `
        -Method POST `
        -Headers @{
            Authorization = "Bearer $token"
        } `
        -ContentType "application/json" `
        -Body $postBody

    Write-Host "`nPASS: Post created successfully." -ForegroundColor Green
    $postResponse | ConvertTo-Json -Depth 10

    if ($postResponse.post._id) {
        Write-Host "`nSUCCESS: Post ID: $($postResponse.post._id)" -ForegroundColor Green
    }


        if ($result.media.url -and $result.media.publicId) {
            Write-Host "`nSUCCESS: Cloudinary URL and publicId received." -ForegroundColor Green
        }
    }
    finally {
        if ($fileStream) { $fileStream.Dispose() }
        $multipart.Dispose()
        $client.Dispose()
        Remove-Item $tempImage -Force -ErrorAction SilentlyContinue
    }


}
catch {
    Write-Host "`nTEST FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    $password = $null
    $securePassword = $null
    $credential = $null
}
