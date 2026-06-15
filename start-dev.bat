@echo off
REM 내전 고? 개발 서버 실행 (더블클릭하세요)
chcp 65001 >nul
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

echo.
echo  ====================================
echo   내전 고? 개발 서버를 시작합니다
echo  ====================================
echo.

if not exist "node_modules" (
  echo  [최초 실행] 의존성 설치 중... 잠시 기다려주세요.
  call npm install
)

echo  브라우저에서 http://localhost:3000 으로 접속하세요.
echo  (종료하려면 이 창에서 Ctrl+C)
echo.
call npm run dev
pause
