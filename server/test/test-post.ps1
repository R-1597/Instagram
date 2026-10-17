
$baseUrl = "http://localhost:5000"

# Log in to get a fresh access token
$loginBody = @{
    email    = "followtesta@example.com"
    password = "TestPass123!Secure"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody

    $token = $loginResponse.accessToken

    if (-not $token) {
        $token = $loginResponse.token
    }

    if (-not $token) {
        throw "Login succeeded but no access token was found."
    }

    Write-Host "PASS: Login successful." -ForegroundColor Green

    # Create a post
    $headers = @{
        Authorization = "Bearer $token"
    }

    $postBody = @{
        caption = "My first post"
        media = @(
            @{
                type      = "image"
                url       = "https://example.com/image.jpg"
                publicId  = "test-image-001"
                width     = 1080
                height    = 1080
            }
        )
    } | ConvertTo-Json -Depth 5

    $postResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/posts" `
        -Method Post `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $postBody

    Write-Host "PASS: Create-post request succeeded." -ForegroundColor Green
    $postResponse | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "FAIL: Request failed." -ForegroundColor Red

    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    } else {
        Write-Host $_.Exception.Message
    }
}
