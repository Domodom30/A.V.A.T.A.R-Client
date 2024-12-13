# Chrome

This plugin (which isn't a plugin) is only there to easily modify `Chrome` settings.

## Parameters:

- **port:** HTTPS communication port with Chrome
- **key:** Subdomain certificate private key file name
- **cert:** The name of the subdomain certificate file
- **address:** The web adress for the connection
- **timeout_ready:** The time in seconds to wait for `Chrome` to initialise completely. After this time, the application automatically restarts a new connection attempt. After 10 attempts, the application will display an error.
- **headless:** Shows (false) or hide (true) `Chrome` browser. Set this property to `false` if you want to see if the certificate is valid or not. Otherwize, leave this property set to `true`
- **log:** If you'd like to see more information about initialising `Chrome`

### Don't delete this plugin, or the application will stop working!
