module.exports = {
    execute(req, res){
        var ret = {
            "retcode":0,
            "message":"OK",
            "data":{
                "list":[{
                    "ann_id":1250,
                    "title":"<b>Welcome to pancake private server!</b>",
                    "subtitle":"<b>Pancake private server</b>",
                    "banner":"placeholder.png",
                    "content":"Welcome.",
                    "lang":"es-es"
                }],
                "total":1
            }
        }
        res.end(JSON.stringify(ret));
    }
}