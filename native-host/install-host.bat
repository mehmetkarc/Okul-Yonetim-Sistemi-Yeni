@echo off
REG ADD "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.okulyonetim.host" /ve /t REG_SZ /d "C:\Users\LENOVO\Desktop\OkulYonetimSistemi\native-host\com.okulyonetim.host.json" /f
echo.
echo ===================================
echo Native host basariyla kuruldu!
echo ===================================
echo.
pause