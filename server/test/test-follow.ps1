$baseUrl = "http://localhost:5000/api/users"

# Replace these values before running the script.
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc5MjE0MzE1MywiZXhwIjoxNzkyMTQ0MDUzLCJhdWQiOiJpbnN0YWdyYW0tY2xvbmUtY2xpZW50IiwiaXNzIjoiaW5zdGFncmFtLWNsb25lLWFwaSIsInN1YiI6IjZhZDExYzMyZTAxN2U5NWI4ZDk0NGVhOSJ9.Alo0zOd9K1DU-iD3e1DaNDhKuAxVaejXo1hzYMlzVrw"
$myUserId = "6ad11c32e017e95b8d944ea9"
$targetUserId = "6ad11c33e017e95b8d944eaa"

$headers = @{
    Authorization = "Bearer $token"
}

function Invoke-TestRequest {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$RequestHeaders = @{}
    )

    try {
        $response = Invoke-WebRequest `
            -Uri $Url `
            -Method $Method `
            -Headers $RequestHeaders `
            -ContentType "application/json" `
            -UseBasicParsing

        return @{
            Status = [int]$response.StatusCode
            Body = $response.Content | ConvertFrom-Json
        }
    }
    catch {
        $status = 0
        $body = $null

        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode

            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $content = $reader.ReadToEnd()
                $reader.Dispose()

                if ($content) {
                    $body = $content | ConvertFrom-Json
                }
            }
            catch {
                # Keep the status even if the error body is not JSON.
            }
        }

        return @{
            Status = $status
            Body = $body
        }
    }
}

function Show-Test {
    param(
        [string]$Name,
        [int]$Actual,
        [int]$Expected
    )

    if ($Actual -eq $Expected) {
        Write-Host "PASS: $Name (HTTP $Actual)"
    }
    else {
        Write-Host "FAIL: $Name (expected HTTP $Expected, got HTTP $Actual)"
    }
}

# 1. Follow Account B
$follow = Invoke-TestRequest `
    -Method "POST" `
    -Url "$baseUrl/$targetUserId/follow" `
    -RequestHeaders $headers

Show-Test "Follow user" $follow.Status 201

# 2. Attempt duplicate follow
$duplicate = Invoke-TestRequest `
    -Method "POST" `
    -Url "$baseUrl/$targetUserId/follow" `
    -RequestHeaders $headers

Show-Test "Duplicate follow rejected" $duplicate.Status 409

# 3. Confirm Account A appears in Account B's followers
$followers = Invoke-TestRequest `
    -Method "GET" `
    -Url "$baseUrl/$targetUserId/followers"

$foundFollower = $false
if ($followers.Body.users) {
    $foundFollower = @(
        $followers.Body.users | Where-Object {
            $_._id -eq $myUserId
        }
    ).Count -gt 0
}

if ($followers.Status -eq 200 -and $foundFollower) {
    Write-Host "PASS: Followers list contains Account A (HTTP 200)"
}
else {
    Write-Host "FAIL: Followers list does not contain Account A"
}

# 4. Confirm Account B appears in Account A's following list
$following = Invoke-TestRequest `
    -Method "GET" `
    -Url "$baseUrl/$myUserId/following"

$foundFollowing = $false
if ($following.Body.users) {
    $foundFollowing = @(
        $following.Body.users | Where-Object {
            $_._id -eq $targetUserId
        }
    ).Count -gt 0
}

if ($following.Status -eq 200 -and $foundFollowing) {
    Write-Host "PASS: Following list contains Account B (HTTP 200)"
}
else {
    Write-Host "FAIL: Following list does not contain Account B"
}

# 5. Unfollow Account B
$unfollow = Invoke-TestRequest `
    -Method "DELETE" `
    -Url "$baseUrl/$targetUserId/follow" `
    -RequestHeaders $headers

Show-Test "Unfollow user" $unfollow.Status 200

# 6. Attempt to unfollow again
$repeatUnfollow = Invoke-TestRequest `
    -Method "DELETE" `
    -Url "$baseUrl/$targetUserId/follow" `
    -RequestHeaders $headers

Show-Test "Repeated unfollow rejected" $repeatUnfollow.Status 404

# 7. Reject self-follow
$selfFollow = Invoke-TestRequest `
    -Method "POST" `
    -Url "$baseUrl/$myUserId/follow" `
    -RequestHeaders $headers

Show-Test "Self-follow rejected" $selfFollow.Status 400

# 8. Reject unauthenticated follow
$noAuth = Invoke-TestRequest `
    -Method "POST" `
    -Url "$baseUrl/$targetUserId/follow"

Show-Test "Unauthenticated follow rejected" $noAuth.Status 401