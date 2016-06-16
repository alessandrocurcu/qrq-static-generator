module.exports = function() {

    // Oggetto da esportare
    var config = {

        jade: {
            toCompile: "src/views/!(_base)*.jade",
            dev : {
                watch: ["src/views/**/*.jade", "src/testi/testi_json/*json"]
            },
            prod: {

            }
        },

        sass: {
            toCompile: "src/sass/*.scss",
            dev: {
                watch: "src/sass/**/*.scss"
            },
            prod: {

            }
        },

        js: {
            toCompile: "src/js/index.js",
            dev: {
                watch: "src/js/**/*.js"
            },
            prod: {

            }
        }
    };

    return config;
};