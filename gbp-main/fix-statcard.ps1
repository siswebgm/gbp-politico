$ErrorActionPreference = 'Stop'
$p = 'c:\Users\jmend\sistema-vereador\gbp-main\src\pages\Dashboard\components\StatCard.tsx'
$c = [System.IO.File]::ReadAllText($p) -replace "`r`n", "`n"

function LF($s) { return ($s -replace "`r`n", "`n") }

$old1 = LF @'
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {value.toLocaleString('pt-BR')}
                </p>
                <p className="ml-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                  /{total}
                </p>
'@

$new1 = LF @'
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {value.toLocaleString('pt-BR')}
                </p>
'@

$old2 = LF @'
          <div className="text-right">
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              stats?.crescimento >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
            }`}>
              {stats?.crescimento >= 0 ? '+' : ''}{(stats?.crescimento || 0).toFixed(1)}%
            </div>
          </div>
'@

$new2 = LF @'
          <div className="text-right">
            <div
              className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                stats?.crescimento >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
              }`}
              title="Comparado ao mês anterior"
            >
              {stats?.crescimento >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {stats?.crescimento >= 0 ? '+' : ''}{(stats?.crescimento || 0).toFixed(1)}%
            </div>
            <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">vs mês anterior</p>
          </div>
'@

if (-not $c.Contains($old1)) { Write-Host 'OLD1 NOT FOUND'; exit 1 }
$c = $c.Replace($old1, $new1)
if (-not $c.Contains($old2)) { Write-Host 'OLD2 NOT FOUND'; exit 1 }
$c = $c.Replace($old2, $new2)

$c = $c -replace "`n", "`r`n"
[System.IO.File]::WriteAllText($p, $c, (New-Object System.Text.UTF8Encoding($false)))
Write-Host 'OK'
