![Version](https://img.shields.io/github/v/release/leozusa/visier-tableau-basic-auth)

# Visier-tableau-basic-auth

Visier Data Connector API for Data Exports provides a http interface with Basic Authentication that the [Web Data Connector](https://tableau.github.io/webdataconnector/docs/) doesn't support,
so this should work as a bridge between both

## How to use

1. Start a new WDC connection in Tableau Desktop 2019.4 or higher and enter: https://visier-tableau-basic-auth.herokuapp.com/
2. Enter your Data Export link with API key.
3. Log in using your Data Export credentials.
4. Click **Get Data!**

## How to Publish

##### Tableau Online

If you want to use this WDC on Tableau Online you will need to set it up using [Tableau Bridge](https://help.tableau.com/current/online/en-us/qs_refresh_local_data.htm)

##### Tableau Server

If you want to use this WDC on your Tableau Server you will first need to [add it to your safelist](https://help.tableau.com/current/server/en-us/datasource_wdc.htm) with the following commands:

```
tsm data-access web-data-connectors add --name "Visier WDC" --url https://visier-tableau-basic-auth.herokuapp.com:443
tsm pending-changes apply
```

This will require your Tableau Server to restart!

## Use it as a template!

[![Deploy it on heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/leozusa/visier-tableau-basic-auth)
[![Remix it on glitch](https://cdn.gomix.com/f3620a78-0ad3-4f81-a271-c8a4faa20f86%2Fremix-button.svg)](https://glitch.com/edit/#!/remix/leozusa-visier-tableau-basic-auth)

## Questions?

[Open an issue!](https://github.com/leozusa/visier-tableau-basic-auth/issues/new)
