$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$b = '{"login":"hamdmjyb11@gmail.com"}'
try {
    $response = Invoke-WebRequest -Uri 'https://medical-booking-backend-production.up.railway.app/api/v1/recovery/check-account' -Method Post -Body $b -ContentType 'application/json; charset=utf-8'
    Write-Host "Raw: " $response.Content
} catch {
    Write-Host "Error: $_"
}
