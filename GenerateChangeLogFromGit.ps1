<#
Generate the change log in json
#>
param(
	[ValidateSet("True","False", 0, 1)]
	[ValidateNotNullOrEmpty()]
	[string]$OutputAsString = "False",
    [string]$OutputFilename = "changelog.json",
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

function ConvertStringToBoolean ([string]$value) {
	$value = $value.ToLower();

	switch ($value) {
		"true" { return $true; }
		"1" { return $true; }
		"false" { return $false; }
		"0" { return $false; }
	}
}

Write-Host ("OutputFilename: {0}"-f $OutputFilename)
Write-Host ("GitDirectory: {0}"-f $GitDirectory)
Write-Host ("OutputAsString: {0}"-f $OutputAsString)

[bool]$outputJsonAsString = ConvertStringToBoolean($OutputAsString);

Write-Host ("Removing file '{0}'..." -f $OutputFilename)

Remove-Item $OutputFilename -Force -ErrorAction Ignore

$currentDirectory = Get-Location

Write-Host ("Changing to folder '{0}'..." -f $GitDirectory)

Set-Location $GitDirectory

# Using ^@^ as an easy to find (and unlikey to be in our git logs) as a delimiter. 
git log --since=10.days --pretty=format:'{ ^@^shorthashId^@^: ^@^%h^@^, ^@^hash^@^: ^@^%H^@^,^@^parents^@^:^@^%P^@^,^@^tree^@^:^@^%T^@^,^@^author^@^: ^@^%an^@^,^@^date^@^: ^@^%cI^@^,^@^authordate^@^: ^@^%aI^@^,^@^subject^@^: ^@^%s^@^,^@^body^@^: ^@^%B^@^ },^^' > $OutputFilename

Write-Host ("Loading git output from file '{0}'..." -f $OutputFilename)

# use Out String to preserve the formatting
[string]$logContent = get-content($OutputFilename) | Out-String

if (![String]::IsNullOrEmpty($logContent)){

    Write-Host "Processing git log file..."

    # escape backslach any body text
    $escapeBackslash = "\\"
    if ($outputJsonAsString -eq $true){
        $escapeSingleQuotes = "\\\"
    }
    $logContent = $logContent.replace("\", $escapeBackslash)

    # Remove the end of line between commit messages.
    $logContent = $logContent.replace("^^`r`n", "")

    # Change new line characters in the json
    $logContent = $logContent.replace("`r`n", "\\n")

    # Change the tab characters in the json
    $logContent = $logContent.replace("`t", "\\t")

    # escape quotes in any body text
    $escapeQuotes = '\"'
    if ($outputJsonAsString -eq $true){
        $escapeQuotes = '\\\"'
    }
    $logContent = $logContent.replace('"', $escapeQuotes)

    $escapeSingleQuotes = "\\'"
    if ($outputJsonAsString -eq $true){
        $escapeSingleQuotes = "\\'"
    }
    $logContent = $logContent.replace("'", $escapeSingleQuotes)

    # Change string delimiters
    $quote = '"'
    if ($outputJsonAsString -eq $true){
        $quote = '\"'
    }
    $logContent = $logContent.replace('^@^', $quote)
    
    # remove trailing comma
    $logContent = $logContent.Substring(0, $logContent.Length - 1)
    
    #change into a json array
    $logContent = '[' + $logContent +  ']'
    
    if ($outputJsonAsString -eq $true){
        $logContent = '"' + $logContent +  '"'
    }

    Write-Host ("Writing json file '{0}'..." -f $OutputFilename)

    $logContent | out-file $OutputFilename

    $global:LASTEXITCODE = 0
}
else{
    Write-Error ("No git log export found!")
    $global:LASTEXITCODE = 1
}

# Get End Time
$endDTM = (Get-Date)

# Echo Time elapsed
Write-host "Elapsed Time taken: $(($endDTM-$startDTM).totalseconds) seconds"

Set-Location $currentDirectory

exit $global:LASTEXITCODE