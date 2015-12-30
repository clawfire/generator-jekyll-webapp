import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import browserSync from 'browser-sync';
import del from 'del';
import cp from 'child_process';
import {stream as wiredep} from 'wiredep';
import fs from 'fs';
var argv = require('yargs').argv;

const $ = gulpLoadPlugins();
const reload = browserSync.reload;
const pkg = require('./package.json');

var env = argv.env || pkg.config.dev_destination;

/*
* Compiles Jekyll then refreshes once done
*/
gulp.task('jekyll', (done) => {
    browserSync.notify('Jekyll rebuilt');
    cp.spawn('jekyll', ['build', '--destination', env], {stdio: 'inherit'}).on('close', function(){
        done();
        reload();
    });
});

/*
* Compiles SCSS Files into the env folder
*/
gulp.task('styles', () => {
    return gulp.src('_scss/*.scss')
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.sass.sync({
        outputStyle: 'expanded',
        precision: 10,
        includePaths: ['.']
    }).on('error', $.sass.logError))
    .pipe($.autoprefixer({browsers: ['> 1%', 'last 2 versions', 'Firefox ESR']}))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest(env + '/assets/css'))
    .pipe(reload({stream: true}));
});

/*
* Runs ESLint on JS
*/
function lint(files) {
  return () => {
    return gulp.src(files)
      .pipe(reload({stream: true, once: true}))
      .pipe($.eslint({
        "env": {
            "browser": true,
            "node": true
        },
        "globals" : {
            "$": true,
            "Modernizr": true
        }
      }))
      .pipe($.eslint.format())
      .pipe($.if(!browserSync.active, $.eslint.failAfterError()));
  };
}

gulp.task('lint', lint(['scripts/**/*.js', '!scripts/analytics.js', '!scripts/webfontloader.js']));

/*
* Find our generated html files
* and inline the critical css
*/
gulp.task('inline-critical', () => {
    return gulp.src(env + '/**/*.html')
    .pipe($.inlineSource())
    .pipe(gulp.dest(env));
});

/*
* Download google tools
*/
gulp.task('google-things', () => {
    $.download('https://www.google-analytics.com/analytics.js')
    .pipe(gulp.dest('scripts'))
    $.download('https://raw.githubusercontent.com/typekit/webfontloader/master/webfontloader.js')
    .pipe(gulp.dest('scripts'))
});

/*
* Minify JS, CSS, HTML and include critical.css
*/
gulp.task('html', ['jekyll'], () => {

    /* Download Google Things */
    gulp.start('google-things');

    /*
    * Take all the generated .html files
    * and we pull out the .js and css files
    * we then concatinate them and minify
    */
    gulp.src( env + '/*.html')
    .pipe($.useref({searchPath: ['.tmp', env, '.', 'scripts']}))
    .pipe($.if('*.js', $.uglify()))
    .pipe($.if('*.css', $.cssnano({
        discardComments: { removeAll: true },
        discardEmpty: true
    })))
    .pipe($.if('*.html', $.htmlmin({
        collapseWhitespace: true
    })))
    .pipe(gulp.dest(env));

    /*
    * Once everythings extracted we generate the sass
    */
    setTimeout(function(){
        gulp.start('inline-critical');
    }, 200);
    return gulp.start('styles');
});

/*
* Optimises Images for Distribution
*/
gulp.task('images', () => {
    return gulp.src( './assets/img/**/*.*')
    .pipe($.if($.if.isFile, $.cache($.imagemin({
        progressive: true,
        interlaced: true,
        svgoPlugins: [{cleanupIDs: false}]
    }))
    .on('error', function (err) {
        console.log(err);
        this.end();
    })))
    .pipe(gulp.dest(env + '/assets/img'));
});

/*
* Copies any extra files like robots.txt etc
*/
gulp.task('extras', () => {
    return gulp.src([
        env + '/*.*',
        '!' + env + '/*.html'
        ], {
        dot: true
    }).pipe(gulp.dest(env));
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist', 'dev', env]));

/*
* Boot up browser-sync then
* start some watchers to inject
* updated code, then we force generate the
* styles
*/
gulp.task('serve', ['clean','jekyll'], (done) => {

    /*
    * Boots up bS
    */
    browserSync({
        notify: false,
        port: 9000,
        server: {
            baseDir: [env, '.'],
            routes: {
                '/bower_components': 'bower_components'
            }
        }
    });

    /*
    * Watch some files to inject
    */
    gulp.watch([
        'scripts/**/*.js',
        env + '/images/**/*',
    ]).on('change', reload);

    gulp.watch('scripts/**/*.js', ['lint','dev-scripts']);
    gulp.watch('_scss/**/*.scss', ['styles']);
    gulp.watch('bower.json', ['wiredep']);
    gulp.watch(['**/*.html', '!' + env + '/**/*.html'], ['jekyll']);

    /*
    * Just force runs it the first time
    */
    gulp.start('styles');
});

gulp.task('serve:dist', () => {

    /*
    * Boots up bS from the distribution folder
    */
    browserSync({
        notify: false,
        port: 9000,
        server: {
            baseDir: [pkg.config.dist_destination]
        }
    });
});

gulp.task('dev-scripts', () => {

    /*
    * Copies JS into temp folders
    */
    gulp.src('scripts/**/*.js')
    .pipe(wiredep({
        ignorePath: /^(\.\.\/)+/
    }))
    .pipe(gulp.dest( env + '/scripts'));
});

/*
* Listens for new dependencies from bower and injects them
*/
gulp.task('wiredep', () => {

    gulp.src('_scss/*.scss')
        .pipe(wiredep({
        ignorePath: /^(\.\.\/)+/
    }))
    .pipe(gulp.dest( env + '/assets/css'));

    gulp.src('_layouts/*.html')
        .pipe(wiredep({
        ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest( './_layouts' ));

    gulp.src('_includes/footer.html')
        .pipe(wiredep({
        ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest( './_includes' ));
});

/*
* Alias task to force order running
*/
gulp.task('build', ['lint', 'html', 'images', 'extras'], () => {
    return gulp.src( env + '/**/*').pipe($.size({title: 'build', gzip: true}));
});

/*
* Default task - which is distrubtion mode
*/
gulp.task('default', ['clean'], () => {
  env = pkg.config.dist_destination;
  gulp.start('build');
});
