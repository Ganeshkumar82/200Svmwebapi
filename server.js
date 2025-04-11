module.exports = {
    apps: [
        {
            name: "CCC API server",
            script:"./index.js",
            instances: "max",
            exec_mode: "cluster",
            watch: false,
            env:{
                NODE_ENV:"development",
                PORT: 8080
            },
            env_production:{
                NODE_ENV : "production",
                PORT: 8080
            }
        }
    ]
}