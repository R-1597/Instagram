
$baseUrl = "http://localhost:5000/api/posts"

$postId = Read-Host "Enter a valid Post ID"

try {
    $response = Invoke-RestMethod `
        -Uri "$baseUrl/$postId" `
        -Method Get

    if ($null -eq $response.post) {
        throw "Post object is missing from the response."
    }

    if ($null -eq $response.post.likeCount) {
        throw "likeCount is missing from the response."
    }

    if ($null -eq $response.post.isLikedByMe) {
        throw "isLikedByMe is missing from the response."
    }

    if ($response.post.isLikedByMe -isnot [bool]) {
        throw "isLikedByMe must be a Boolean."
    }

    Write-Host "PASS: Post retrieved successfully." -ForegroundColor Green
    Write-Host "PASS: likeCount = $($response.post.likeCount)" -ForegroundColor Green
    Write-Host "PASS: isLikedByMe = $($response.post.isLikedByMe)" -ForegroundColor Green

    Write-Host "`nFull response:"
    $response | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    }
}
