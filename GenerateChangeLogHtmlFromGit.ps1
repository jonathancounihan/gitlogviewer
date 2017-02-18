<#
Generate the change log in html
#>
param(
    [string]$OutputFilename = "changelog.html",
    [string]$GitDirectory = ""
)

# Get Start Time
$startDTM = (Get-Date)

# required to generate a proper exit code on errors.
trap 
{ 
  Write-Error $_.Exception | format-list -force
  exit 1 
}

Write-Host ("OutputFilename: {0}"-f $OutputFilename)
Write-Host ("GitDirectory: {0}"-f $GitDirectory)

Write-Host ("Changing to folder '{0}'..." -f $GitDirectory)

Set-Location $GitDirectory

Write-Host ("Removing file '{0}'..." -f $OutputFilename)

Remove-Item $OutputFilename -Force -ErrorAction Ignore

echo "<h3>Change Log</h3><br/><table>" >> $OutputFilename
$tdStyle = "style='border-right: 1px solid black;padding: 10px;'"
$tdStyleLast = "style='padding: 10px;'"
$format = "<tr><td $tdStyle>%h</td><td $tdStyle width='50%'>%s<br/><br/>%b</td><td $tdStyle>%cI</td><td $tdStyleLast>%an</td></tr><tr><td style='background-color:black' colspan='4'></td></tr>"
git log  --pretty=format:""$format"" >> $OutputFilename
echo "</table>" >> $OutputFilename

# use Out String to preserve the formatting
[string]$logContent = get-content($OutputFilename) | Out-String

if ([String]::IsNullOrEmpty($logContent)){
    Write-Error ("No git log html found!")
    $global:LASTEXITCODE = 1
}

# Get End Time
$endDTM = (Get-Date)

# Echo Time elapsed
Write-host "Elapsed Time taken: $(($endDTM-$startDTM).totalseconds) seconds"

exit $global:LASTEXITCODE