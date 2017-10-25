module.exports = function(ctx) {
  const Q = ctx.requireCordovaModule('q')
  const path = ctx.requireCordovaModule('path')
  const fs = ctx.requireCordovaModule('fs')
  const cp = ctx.requireCordovaModule('child_process')
  const os = ctx.requireCordovaModule('os')
  const ifaces = os.networkInterfaces()
  const spawn = cp.spawn
  const exec = cp.exec
  const pRoot = ctx.opts.projectRoot
  const nodeModulesPath = path.resolve(pRoot, 'node_modules/')
  const wwwFolder = path.resolve(pRoot, 'www/')
  const manifestFileSrcPath = path.resolve(pRoot, 'src/manifest.json')
  const manifestFileCopyPath = path.resolve(wwwFolder, 'manifest.json')
  const webpackPath = path.resolve(nodeModulesPath, '.bin/webpack')
  const epipeBombPath = path.resolve(nodeModulesPath, '.bin/epipebomb')
  const webpackDevServerPath = path.resolve(nodeModulesPath, '.bin/webpack-dev-server')
  const packageJsonPath = path.resolve(__dirname, '../package.json')
  const packageJson = require(packageJsonPath)

  function getRouterIpAddr() {
    for (let key in ifaces) {
      if (ifaces.hasOwnProperty(key)) {
        for (let ipInfoKey in ifaces[key]) {
          if (ifaces[key].hasOwnProperty(ipInfoKey)) {
            let ipInfo = ifaces[key][ipInfoKey]

            if (
              ipInfo.family === 'IPv4' &&
              ipInfo.address.indexOf('192.168.') === 0 &&
              !ipInfo.internal
            )
              return ipInfo.address
          }
        }
      }
    }

    return '127.0.0.1'
  }

  const sys = {
    toKebabCase(txt) {
      return txt.replace(/(\s)+/g, '-').replace(/[A-Z]/g, function(t) {
        return t.toLowerCase()
      })
    },

    checkPackageName() {
      if (typeof packageJson.name === 'undefined' || packageJson.name === '') {
        packageJson.name = 'hello-world'
      } else if (/\s/g.test(packageJson.name)) {
        packageJson.name = sys.toKebabCase(packageJson.name)
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson), 'utf-8')
      }
    },

    deleteFolderRecursive(path, doNotDeleteSelf = false) {
      if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(file => {
          let curPath = path + '/' + file
          if (fs.lstatSync(curPath).isDirectory()) sys.deleteFolderRecursive(curPath)
          else fs.unlinkSync(curPath)
        })

        if (!doNotDeleteSelf) fs.rmdirSync(path)
      }
    },

    cleanWww() {
      let wwwDir = path.resolve(__dirname, '../www/')
      sys.deleteFolderRecursive(wwwDir, true)
    },

    checkManifestFile() {
      if (fs.existsSync(manifestFileSrcPath)) {
        console.log('Manifest.json found in src folder. Copying...')
        fs.writeFileSync(manifestFileCopyPath, fs.readFileSync(manifestFileSrcPath))
      }
    },

    checkNodeModules() {
      /* eslint-disable new-cap */
      let defer = new Q.defer()
      /* eslint-enable new-cap */

      console.log('Installing node_modules...')

      exec('npm i', { cwd: pRoot, maxBuffer: 1024 * 1024 * 5 }, error => {
        if (error) {
          console.error(`Error on npm install: ${error}`)
          defer.reject(new Error(`Error on npm install: ${error}`))
        }

        console.log('Node modules installed successfully')
        defer.resolve()
      })

      return defer.promise
    },

    makeNonDevServerChanges() {
      /* eslint-disable new-cap */
      let defer = new Q.defer()
      /* eslint-enable new-cap */
      let cheerio = require('cheerio')
      let configFile = path.resolve(__dirname, '../config.xml')
      let conf = cheerio.load(fs.readFileSync(configFile), { xmlMode: true })

      if (conf('allow-navigation').length > 0) {
        let target = conf('allow-navigation')

        if (target.attr('data-href') !== '') {
          target.attr('href', target.attr('data-href'))
          target.removeAttr('data-href')
        }
      }

      fs.writeFileSync(configFile, conf.html(), 'utf-8')
      sys.cleanWww()

      defer.resolve()

      return defer.promise
    },

    makeDevServerChanges() {
      /* eslint-disable new-cap */
      let defer = new Q.defer()
      /* eslint-enable new-cap */
      let configFile = path.resolve(__dirname, '../config.xml')
      let srcFile = path.resolve(__dirname, '../webpack/dev_helpers/device_router.html')
      let targetFile = path.resolve(wwwFolder, 'index.html')
      let defaultCsp = `default-src *; script-src 'self' data: 'unsafe-inline' 'unsafe-eval' http://127.0.0.1:8081 http://LOCIP:8081; object-src 'self' data: http://127.0.0.1:8081 http://LOCIP:8081; style-src 'self' 'unsafe-inline' data: ; img-src *; media-src 'self' data: http://127.0.0.1:8081 http://LOCIP:8081; frame-src 'self' data: http://127.0.0.1:8081 http://LOCIP:8081; font-src *; connect-src 'self' data: http://127.0.0.1:8081 http://LOCIP:8081`
      let cheerio = require('cheerio')
      let $ = cheerio.load(fs.readFileSync(srcFile, 'utf-8'))
      let conf = cheerio.load(fs.readFileSync(configFile), { xmlMode: true })

      // Sys.cleanWww()

      $('head').prepend(
        `<meta http-equiv="content-security-policy" content="${defaultCsp.replace(
          /LOCIP/g,
          getRouterIpAddr()
        )}">`
      )
      $('body')
        .prepend(`<script>const localServerIp = '${getRouterIpAddr()}'</script>`)
        .append(`<script src="cordova.js"></script>`)
        .append(`<script src="bluetoothle.js"></script>`)
      fs.writeFileSync(targetFile, $.html())

      if (conf('allow-navigation').length === 0)
        conf('widget').append('<allow-navigation href="*" />')
      else {
        let target = conf('allow-navigation')

        if (target.attr('href') !== '*')
          target.attr('data-href', target.attr('href')).attr('href', '*')
      }

      fs.writeFileSync(configFile, conf.html(), 'utf-8')

      defer.resolve()

      return defer.promise
    },

    startWebpackBuild() {
      /* eslint-disable new-cap */
      let defer = new Q.defer()
      /* eslint-enable new-cap */

      console.log('Starting webpack build...')

      let wpPath = webpackPath + (os.platform() === 'win32' ? '.cmd' : '')

      exec(
        `"${wpPath}" --env.release`,
        { cwd: pRoot, maxBuffer: 1024 * 1024 * 5 },
        error => {
          if (error) {
            console.error(`Error with webpack build: ${error}`)
            defer.reject(new Error(`Error with webpack build: ${error}`))
          }

          sys.checkManifestFile()

          console.log('Webpack built to www folder successfully')
          defer.resolve()
        }
      )

      return defer.promise
    },

    startWebpackDevServer() {
      /* eslint-disable new-cap */
      let defer = new Q.defer()
      /* eslint-enable new-cap */
      let outText = ''
      let isResultFound = false
      let args = [
        `"${webpackDevServerPath}"`,
        '--hot',
        '--inline',
        '--env.devserver',
        `--public ${getRouterIpAddr()}:8081`
      ]
      let run = epipeBombPath

      if (os.platform() === 'win32') {
        args = [
          '--hot',
          '--inline',
          '--env.devserver',
          `--public ${getRouterIpAddr()}:8081`
        ]
        run = `"${webpackDevServerPath}.cmd"`
      }

      let devServerSpawn = spawn(run, args, {
        shell: true,
        cwd: pRoot,
        stdio: [process.stdin, 'pipe', process.stderr]
      })

      devServerSpawn.on('error', err => {
        console.log('Failed to start webpack dev server')
        console.log(err)

        defer.reject(err)
      })

      devServerSpawn.stdout.on('data', data => {
        process.stdout.write(data)

        if (!isResultFound) {
          outText += data

          if (
            outText.indexOf('bundle is now VALID.') > -1 ||
            outText.indexOf('Compiled successfully.') > -1 ||
            outText.indexOf('Compiled with warnings') > -1
          ) {
            isResultFound = true
            outText = ''

            defer.resolve()
          }
        }
      })

      return defer.promise
    },

    emptyDefer() {
      /* eslint-disable new-cap */
      let defer = new Q.defer()
      /* eslint-enable new-cap */

      defer.resolve()

      return defer.promise
    },

    checkOption(name) {
      return (
        typeof ctx.opts !== 'undefined' &&
        typeof ctx.opts.options !== 'undefined' &&
        typeof ctx.opts.options[name] !== 'undefined' &&
        ctx.opts.options[name] === true
      )
    },

    checkArgv(name) {
      return (
        typeof ctx.opts !== 'undefined' &&
        typeof ctx.opts.options !== 'undefined' &&
        typeof ctx.opts.options.argv !== 'undefined' &&
        ((Array.isArray(ctx.opts.options.argv) &&
          ctx.opts.options.argv.indexOf(name) > -1) ||
          ctx.opts.options.argv[name] === true)
      )
    },

    isFoundInCmdline(cmdCommand) {
      return (
        ctx.cmdLine.indexOf(`cordova ${cmdCommand}`) > -1 ||
        ctx.cmdLine.indexOf(`phonegap ${cmdCommand}`) > -1
      )
    },

    copyRecursiveSync(src, dest) {
      let exists = fs.existsSync(src)
      let stats = exists && fs.statSync(src)
      let isDirectory = exists && stats.isDirectory()

      if (exists && isDirectory) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest)

        fs.readdirSync(src).forEach(childItemName => {
          sys.copyRecursiveSync(
            path.join(src, childItemName),
            path.join(dest, childItemName)
          )
        })
      } else fs.linkSync(src, dest)
    },

    copyFile(source, target, cb) {
      let cbCalled = false

      let rd = fs.createReadStream(source)
      rd.on('error', done)

      let wr = fs.createWriteStream(target)
      wr.on('error', done)
      wr.on('close', done)
      rd.pipe(wr)

      function done(err) {
        if (!cbCalled && typeof cb === 'function') {
          cb(err)
          cbCalled = true
        }
      }
    }
  }

  /* eslint-disable new-cap */
  let deferral = new Q.defer()
  /* eslint-enable new-cap */
  let isBuild = sys.isFoundInCmdline('build')
  let isRun = sys.isFoundInCmdline('run')
  let isEmulate = sys.isFoundInCmdline('emulate')
  let isPrepare = sys.isFoundInCmdline('prepare')
  let isServe = sys.isFoundInCmdline('serve')
  let isLiveReload =
    sys.checkArgv('--live-reload') ||
    sys.checkArgv('--lr') ||
    sys.checkArgv('lr') ||
    sys.checkArgv('live-reload')
  let isNoBuild = sys.checkOption('no-build')
  let isRelease = sys.checkOption('release')

  if (ctx.opts.platforms.length === 0 && !isPrepare) {
    console.log('Update happened. Skipping...')
    deferral.resolve()
  } else {
    console.log('Before deploy hook started...')

    // If package name contains space characters, we'll convert it to kebab case. Required for npm install command to work.
    sys.checkPackageName()

    sys
      .checkNodeModules()
      .then(() => {
        if (isBuild || ((isRun || isEmulate || isPrepare) && !isNoBuild)) {
          return sys
            .makeNonDevServerChanges()
            .then(() => sys.startWebpackBuild(isRelease))
        }
        if (isServe || ((isRun || isEmulate) && isLiveReload)) {
          return sys.makeDevServerChanges().then(() => sys.startWebpackDevServer())
        }
        return sys.emptyDefer()
      })
      .then(() => {
        console.log('Cordova hook completed. Resuming to run your cordova command...')
        deferral.resolve()
      })
      .catch(err => {
        console.log('Error happened on main chain:')
        console.log(err)

        deferral.reject(err)
      })
      .done()
  }

  return deferral.promise
}
