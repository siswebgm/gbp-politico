@echo off
echo Limpando containers, imagens e volumes não utilizados...
docker system prune -f
docker volume prune -f

echo Construindo a imagem com configurações otimizadas...
docker build --no-cache --memory=2g --memory-swap=2g -t gbp-politico:light -f Dockerfile.light .

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Build concluido com sucesso!
    echo.
    echo Para executar o container, use:
    echo docker run -p 80:80 gbp-politico:light
) else (
    echo.
    echo Ocorreu um erro durante o build.
    echo Tente aumentar a memoria disponivel para o Docker.
)

pause
