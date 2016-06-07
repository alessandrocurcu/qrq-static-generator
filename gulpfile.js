var gulp = require("gulp");
var del = require("del");
var jade = require("gulp-pug");
var util = require("gulp-util");
var browserSync = require("browser-sync");
var nodemon = require("gulp-nodemon");
var plumber = require("gulp-plumber");
var gulprint = require("gulp-print");
var runSequence = require("run-sequence");
var moduleImporter = require("sass-module-importer");
var sass = require("gulp-sass");
var sourcemaps = require("gulp-sourcemaps");
var autoprefixer = require("gulp-autoprefixer");
var uncss = require("gulp-uncss");
var csso = require("gulp-csso");
var gulpif = require("gulp-if");
var useref = require("gulp-useref");
var gdata = require("gulp-data");
var marked = require("marked");
var markdown = require("gulp-markdown-to-json");
var path = require("path");
var rename = require("gulp-rename");
var imagemin = require("gulp-imagemin");
var uglify = require("gulp-uglify");
var browserify = require("gulp-browserify");
var critical = require("critical");
var changed = require("gulp-changed");
var fs = require("fs");
var config = require("./gulpconfig.js")();

/* ==========================================================================
   Development environment
   ========================================================================== */

/* jade */

gulp.task("jade", function() {
    log("Compilo jade in html");
    return gulp.src(config.jade.toCompile)
        .pipe(plumber())
        .pipe(gulprint(function(filepath){
            return "File compilato: " + filepath;
        }))
        .pipe(gdata(function(file){
            try {
                return JSON.parse(fs.readFileSync("./src/testi/testi_json/" + path.basename(file.path, ".jade") + ".json"));
            }
            catch (e) {
                util.noop();
            }
        }))
        .pipe(jade({
            pretty: true
        }))
        .pipe(util.env.prod ? gulp.dest("prod") : gulp.dest("dev"))
        .pipe(browserSync.stream());
});

gulp.task("jade:watch", ["jade"], function() {
    log("Osservo i file jade");
    gulp.watch(config.jade.dev.watch, ["jade"]);
});

/* sass */

gulp.task("sass", function () {
    log("Compilo sass in css");
    return gulp.src(config.sass.toCompile)
        .pipe(plumber())
        .pipe(gulprint(function(filepath){
            return "File compilato: " + filepath;
        }))
        .pipe(util.env.prod ? util.noop() : sourcemaps.init())
        .pipe(sass({importer: moduleImporter()}))
        .pipe(autoprefixer())
        .pipe(util.env.prod ? uncss({html: ["dev/*.html"]}) : util.noop())
        .pipe(util.env.prod ? util.noop() : sourcemaps.write())
        .pipe(util.env.prod ? gulp.dest("prod/css") : gulp.dest("dev/css"))
        .pipe(browserSync.stream());
});

gulp.task("sass:watch", ["sass"], function () {
    log("Osservo i file sass");
    gulp.watch(config.sass.dev.watch, ["sass"]);
});

/* script */

gulp.task("js", function() {
    log("Incorporo insieme gli script");
    gulp.src(config.js.toCompile)
        .pipe(plumber())
        .pipe(gulprint(function(filepath){
            return "File compilato: " + filepath;
        }))
        .pipe(browserify())
        .pipe(util.env.prod ? gulp.dest("prod/js") : gulp.dest("dev/js"))
        .pipe(browserSync.stream());
});

gulp.task("js:watch", ["js"], function () {
    log("Osservo i file js");
    gulp.watch(config.js.dev.watch, ["js"]);
});


/* ==========================================================================
   Asset
   ========================================================================== */

/* Testi */

/**
 * Di base marked genera degli id sugli heading che,
 * in questo caso, non vogliamo.
 */
var renderer = new marked.Renderer();
renderer.heading = function (text, level) {
    return "<h" + level + ">" + text + "</h" + level + ">";
};


/**
 * In "to_json" abbiamo un rename perché i file sorgente sono .txt e markdown vuole
 * file .md da tradurre in .json
 */
gulp.task("to_json", function(){
    return gulp.src("src/testi/testi_txt/*.txt")
        .pipe(rename(function (path) {
            path.extname = ".md"
        }))
        .pipe(changed("./src/views/testi/testi_json", {extension: ".json"}))
        .pipe(gulprint(function(filepath){
            return "File compilato: " + filepath;
        }))
        .pipe(markdown({
            renderer: renderer,
            pedantic: true,
            smartypants: true
        }))
        .pipe(gulp.dest("src/testi/testi_json"))
});

/* Immagini */

gulp.task("image", function(){
    return gulp.src("src/img/*.png")
        .pipe(plumber())
        .pipe(imagemin({
            progressive: true
        }))
        .pipe(util.env.prod ? gulp.dest("prod/img") : gulp.dest("dev/img"));
});

/* serve */

gulp.task("browser-sync", ["serve"], function() {
    browserSync.init({
        proxy: "http://localhost:3000",
        browser: "firefoxdeveloperedition",
        port: 7000
    });
});

gulp.task("serve", function () {
    var isDev = true;
    var options = {
        script: "app.js",
        delayTime: 1,
        env: {
            "PORT": 3000,
            "NODE_ENV": isDev ? "dev" : "prod"
        },
        ignore: ["./node_modules", "gulpfile.js"]
    };

    return nodemon(options)
        .on("start", function() {
            log("Ascolto sulla porta 7000 (proxy sulla 3000)");
        })
        .on("restart", function(){
            log("Restart server");
        })
        .on("exit", function(){
            log("Chiudo il server");
        })
        .on("crash", function () {
            log("Lo script è crashato per qualche ragione");
        });
});


/* ==========================================================================
   Production environment
   ========================================================================== */

gulp.task("use", function () {
    return gulp.src("prod/*.html")
        .pipe(plumber())
        .pipe(useref())
        .pipe(gulpif("*.js", uglify()))
        .pipe(gulpif("*.css", csso()))
        .pipe(gulp.dest("prod"));
});

gulp.task("critical_index", function () {
    critical.generate({
        inline: true,
        extract: true,
        base: "prod",
        src: "index.html",
        dest: "prod/index.html",
        minify: true,
        width: 320,
        height: 480
    });
});


/* ==========================================================================
   Comandi build
   ========================================================================== */

gulp.task("dev", function() {
    runSequence("browser-sync", "to_json", ["jade:watch", "sass:watch", "js:watch"]);
});

gulp.task("jade:sass:js", function() {
    runSequence("jade", [ "sass", "js"]); // Questo per evitare che uncss venga lanciato prima che jade abbia finito
});

/**
 * Questo task deve usare la flag --prod (gulp build --prod)
 */
gulp.task("build", function() {
    runSequence("clean:build", "jade:sass:js", "use")
});

gulp.task("clean:build", function() {
    clean("prod/*.html");
    clean("prod/css/*.css");
    clean("prod/css/*.js");
});


/* ==========================================================================
   Helpers
   ========================================================================== */

function log(msg) {
    util.log(util.colors.blue(msg));
}

function clean(path) {
    log("Pulisco...");
    return del(path);
}