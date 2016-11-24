[Jibo SDK & API Documentation](https://developers.jibo.com/sdk/docs/)

# Simple Jibo + IFTTT Sample

This is a simple Jibo skill that helps you connect IFTTT to the Jibo SDK

Original Code and sample posted by [Michael Rodriguez](https://github.com/michaelrod77) in this [forum post](https://discuss.jibo.com/t/how-to-connect-jibo-sdk-to-ifttt-maker-recipe-in-10-minutes/1305)

# Prerequisities

```
Jibo SDK
IFTTT account
Grunt CLI: 'npm install --global grunt-cli'
[NodeJS](https://docs.npmjs.com/getting-started/installing-node)
```

# Installation

Clone repository
Run 'npm install'

# Execution

This project uses the [Grunt](http://gruntjs.com/) task runner
Tasks:
    'grunt build' - lint, unit tests, simulator
    'grunt test' - lint, unit tests
    'grunt lint' - lint

## Special notes

The Jibo SDK requires pixi.js, which must be installed individually with the command 'npm install pixi.js'

When trying to run the simulator, it might not be able to find 'pixi.js/bin/pixi.js'
    If this happens, the pixi.js folder structure might have been installed as node_modules/pixi.js/dist/pixi.js
    My fix for this issue has been to change the name of 'dist' to 'bin'
