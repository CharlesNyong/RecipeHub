const request = require("request");
var externalURL = "";
module.exports = {
    /* request parameters 
    - app id
    - app_key
    - from and to (these are the range of data returned e.g. from 0 to 3)
    - diet 
    */
    setURL: function(blnHomePageQuery, intLength, strSearchItem){
        if(blnHomePageQuery){ // make a generic query
            /*this api call makes a request for low carbs and high protien recipes */
            externalURL = "https://api.edamam.com/search?q=&app_id=f7848741&app_key=492821db847335f495805e80c2c086de&from=0&to="+intLength+"&diet=low-carb&diet=high-protein";
        }
        else if(!blnHomePageQuery){
            if(strSearchItem != ""){
                externalURL = "https://api.edamam.com/search?q="+strSearchItem+"&app_id=f7848741&app_key=492821db847335f495805e80c2c086de&from=0&to="+intLength;
            }
            else{
                console.log("SearchItem is empty");
            }
            console.log("searchURL: "+ externalURL);
        }
    },

    callAPI: (callback) => {
        request(externalURL, {json: true}, (err, res, body) => {
            if(err){
                return callback(err);
            }
            return callback(body);
        });
    }

};