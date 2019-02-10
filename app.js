const express = require("express");
const htmlToplain = require("html2plaintext");
const app = express();
const { check, validationResult } = require('express-validator/check');
const path = require('path');
const bodyParser = require("body-parser"); 
const sql = require("mysql");
const dbConfig = require("./db_config.js");
let connection = sql.createConnection(dbConfig);
const session = require('express-session');
const apiRecipes = require("./request.js"); // use to make api recipe request to edamam.com
const nodemailer = require("nodemailer");
//var popupNotification = require("popups");
/*TODO:
    - ensure that recipe country is not 
       duplicated. To do this, always
       check if a country already exist.
       if it does, then use that country 
       information for all processing
       otherwise insert the country
*/
connection.connect(function(err){
    if(err){
        console.log("DB Error: " + err);
        throw err;
    }
    else{
      console.log("successfully connected");  
    }
});

let emailTransporter = nodemailer.createTransport({
    service: "gmail",
    secure: false,
    port: 25,
    auth:{
        user: "recipehub20@gmail.com",
        pass: "F105baller"
    },
    tls:{
        rejectUnauthorized: false
    }
});

// default email properties
var mailOptions = {
    from: '"Recipe Hub" <RecipeHub@gmail.com>',
    to: 'asikpo.charles@yahoo.com',
    subject: 'Sending Email using Node.js(this is a default subject)',
    text: 'Testing email from nodejs!'
}


// session middleware
app.use(session({ secret: 'keyboard cat'}));

// path setup for view files
app.set('views', path.join(__dirname, 'views'));

app.set('view engine', 'ejs');

// Body parser for retrieving json objects
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

// set public folder for static files
app.use(express.static(path.join(__dirname, '/public'))); 
var myrecipes = [];
var arrApiRecipes = [];
var blnRecipeShared = false;
var blnShareLink = false;

// ROUTERS
app.get("/", function(req, res){
    console.log("shareLink triggered: " + blnShareLink);
    // send to main page if user is not logged in
    if(blnShareLink){
        blnRecipeShared = true;
        blnShareLink = false;
    }else{
        blnRecipeShared = false;
    }

    // using promise api to preserve execution order
    let getRecipePromise = new Promise(function(resolve, reject){
        // make api call
        apiRecipes.setURL(true, 30);
        apiRecipes.callAPI(function(response){
            objAPIrecipes = response;
            console.log("response object from api call: " + objAPIrecipes);
            arrayLen = objAPIrecipes.to; // this is the max number of items returned from the api
             
            //arrRecipes = objAPIrecipes.hits;
            console.log("API returned \n");
            for(i=0; i<arrayLen; i++){
                // only picking the fields i need from the api result
                console.log("Calorie for " + objAPIrecipes.hits[i].recipe.label + " = " + objAPIrecipes.hits[i].recipe.calories + " isNaN = " + isNaN(objAPIrecipes.hits[i].recipe.calories));
                // if(isNaN(objAPIrecipes.hits[i].recipe.calories)){
                //     calorie = "N/A";
                // }
                // else{
                //     calorie = objAPIrecipes.hits[i].recipe.calories;
                // }
                var objRecipeInfo = {
                    recipeName: objAPIrecipes.hits[i].recipe.label,
                    image: objAPIrecipes.hits[i].recipe.image,
                    directions: objAPIrecipes.hits[i].recipe.url,
                    arrIngredients: objAPIrecipes.hits[i].recipe.ingredients,
                    calories: objAPIrecipes.hits[i].recipe.calories
                }

                // set the values of the return array
                arrApiRecipes[i] = objRecipeInfo;    
                console.log(objAPIrecipes.hits[i].recipe.label + "\n");
            }
            if(arrApiRecipes.length>0){
                resolve(arrApiRecipes);
            }else{
                reject("Error loading fetching recipes via API");
            }
        }); 
    }); // end of promise
    
    getRecipePromise.then(function(arrReturn){
        console.log("return array type " + typeof(arrReturn));
        query = "SELECT * FROM recipe WHERE display = 1";
        connection.query(query, function(err, result){
            if(err){
                console.log("could not get all recipe");
            }else{
                myrecipes = result;
                
                //console.log(myrecipes);   
                res.render("Main_Menu", {
                    recipes: result,
                    arrRecipes: arrApiRecipes,
                    emailResponse: (blnRecipeShared == true)? 1:0,
                    error: "",
                    loginID: req.session.userID
                });
            }    

        });
    }).catch(function(err){
        console.log("get recipe promise failed due to error " + err);
        res.render("Main_Menu", {
            recipes: [],
            arrRecipes: [],
            emailResponse: "",
            error: "",
            loginID: req.session.userID
        });
    });    
});

app.get("/myRecipe", function(req, res){
    userID = req.session.userID;
    if(userID !== "" && userID !== undefined){
        query = "SELECT * FROM recipe WHERE userID = " + sql.escape(userID) + " AND display = 1";
        connection.query(query, function(err, result){
            if(err){
                console.log("could not get recipe for user " + userID);
            }else{
                myrecipes = result;
                res.render("Main_Menu", {
                    recipes: result,
                    loginID: userID,
                    emailResponse: JSON.stringify(0),
                    error: "",
                    arrRecipes: arrApiRecipes
                });
                console.log(result);   
            }    

        });
    }
    
});

app.get("/addRecipe", function(req, res){
    console.log("session userID: " + req.session.userID);
    if(req.session.userID !== undefined){
        res.render("add_recipe", {
            error: "",
            loginID: req.session.userID
        });
    }
    else{
        res.redirect("/");
    }
});

// get the login page
app.get("/login", function(req, res){
    res.render("login", {error: ""});
});

// get the logout page
app.get("/logout", function(req, res){
    req.session.destroy();
    myrecipes.length = 0; // reset the array 
    res.redirect("/");
});

function removeDuplicate(arrIngredients){
    var arrExistingItems = [];
    var arrReturn = [];
    
    arrIngredients.forEach(objElement => {
        if(!arrExistingItems.includes(objElement.text)){
            arrReturn.push(objElement); 
        }
        arrExistingItems.push(objElement.text);
    });

    return arrReturn;
}

app.get("/apiRecipeDetails", function(req, res){
    var recipeName = "";
    var calories = ""; 
    for(i=0; i<arrApiRecipes.length; i++){
        console.log("in loop recipe name = " + arrApiRecipes[i].recipeName + " parameter: " + req.query.recipeName);
        if(arrApiRecipes[i].recipeName === req.query.recipeName){
            recipeName = arrApiRecipes[i].recipeName;
            calories = Math.round(arrApiRecipes[i].calories);
            console.log("name: " + recipeName + " calories: " + arrApiRecipes[i].calories);
            arrIngredients = removeDuplicate(arrApiRecipes[i].arrIngredients);
            steps = arrApiRecipes[i].directions;
            break;
        }
    }

    res.render("recipeDetails",
        {
            RecipeName: recipeName,
            Ingredients: arrIngredients,
            calories: calories,
            Steps: steps,
            loginID: req.session.userID,
            isApiRecipe: 1,
            recipeOwner: "API"
        }
    );
});


app.get("/recipeDetails", function(req, res){
    var recipeName = "";
    var description = "";
    var ingredients = "";
    var calories = "";
    var steps = "";
    var userID = ""; 
    for(i=0; i<myrecipes.length; i++){
        console.log("in loop recipeID = " + myrecipes[i].recipeID + " parameter: " + req.query.recipeID);
        if(myrecipes[i].recipeID == req.query.recipeID){
            recipeName = myrecipes[i].recipeName;
            description = myrecipes[i].description;
            ingredients = myrecipes[i].Ingredients;
            steps = myrecipes[i].steps;
            userID = myrecipes[i].userID;
            recipeID = myrecipes[i].recipeID;
            calories = Math.round(myrecipes[i].calories);
            break;
        }
   }

   ingredients = htmlToplain(ingredients);
   steps = htmlToplain(steps);
   console.log("Ingredient: " + "\n" + htmlToplain(ingredients));
   console.log("steps: " + "\n" + htmlToplain(steps));
//    arrIngredients = ingredients.replace(/[\d.|-]*/g, "").split(/[ .:;?!~,`"&|()<>{}\[\]\r\n/\\]+/);
//    arrInstructions = steps.replace(/[\d.|-]*/g, "").split(/\n\r|" "/);

   arrIngredients = ingredients.split(/[\r\n/\\]+/);
   arrInstructions = steps.split(/[\r\n/\\]+/);
//    var ingredientsToDisplay = encode(ingredients);
//    var stepsToDisplay = encode(steps);
//    for(i=0; i<arrIngredients.length; i++){
//        console.log(arrIngredients[i] + "\n");
//        //ingredientsToDisplay += arrIngredients[i] + "\n";
//    }

//    for(i=0; i<arrInstructions.length; i++){
//         stepsToDisplay += arrInstructions[i] + "\n";
//    }
   //console.log("Ingredients: " + ingredientsToDisplay + " steps: " + stepsToDisplay);
  //console.log("food Steps " + stepsToDisplay);
   res.render("recipeDetails",
        {
            RecipeName: recipeName,
            Description: description,
            Ingredients: arrIngredients,
            Steps: arrInstructions,
            loginID: req.session.userID,
            recipeOwner: userID,
            recipeID: recipeID,
            calories: calories,
            isApiRecipe:0 
        }
   );

});

/* instead of deleting, we flag its
    display to false, this prevents 
    it from displaying
*/
app.get("/deleteRecipe", function(req, res){
    var recipeID = req.query.recipeID;
    paramValues = [0, recipeID];
    query = " UPDATE recipe SET display=? WHERE recipeID =? ";
    
    connection.query(query, paramValues, function(err, result){
        if(err){
            console.log("Error: " + err);
            res.send("Error deleting recipe! Error: " + err);  
        }
        else{
            res.redirect("/");
        }
    })
});

// get the edit form for editing
app.get("/editRecipe", function(req, res){
    var recipeID = req.query.recipeID;
    query = " SELECT countryname, recipeName, description, Ingredients, steps FROM recipe " + "\n" +  
            " INNER JOIN recipecountry ON (recipe.countryID = recipecountry.countryID) " + "\n" +    
            " WHERE recipeID = " + sql.escape(recipeID);

    connection.query(query, function(err, result){
       if(err){
            console.log("Database error: " + err);
            res.render("recipeDetails", {error:"problem querying the database"});
       }
       else{
           var Ingredients = result[0].Ingredients;
           var Instructions = result[0].steps;

           if(!(Ingredients.includes("<pre>")) && !(Ingredients.includes("<!pre>"))){
                Ingredients = "<pre>" + Ingredients + "</pre>";
           }    
           if(!(Instructions.includes("<pre>")) && !(Instructions.includes("<!pre>"))){
                Instructions = "<pre>" + Instructions + "</pre>";
           } 
           console.log("In edit recipe, Ingredients " + Ingredients);
        //    var arrIngredients = Ingredients.split(/[\r\n/\\]+/);
        //    var arrInstructions = Instructions.split(/[\r\n/\\]+/);
            objRecipeToEdit = [
               {
                  recipeName: result[0].recipeName,
                  description: result[0].description,
                  country: result[0].countryname,
                  Ingredients: Ingredients,
                  Instructions: Instructions,
                  ID: recipeID  
               }
            ]

            res.render("editRecipe", {
                recipeToEdit: objRecipeToEdit,
                loginID: req.session.userID 
            });
       } 
    });  
});

// get the registration page
app.get("/register", function(req, res){
    res.render("registerUser", {errors: ""});
});

app.post("/search", function(req, res){
    strRecipeToSearch  = req.body.searchBox;
    var arrSearchResult = [];
    // using promise api to preserve execution order
    let getRecipePromise = new Promise(function(resolve, reject){
        // make api call
        apiRecipes.setURL(false, 30, strRecipeToSearch);
        apiRecipes.callAPI(function(response){
            objAPIrecipes = response;
            arrayLen = objAPIrecipes.to; // this is the max number of items returned from the api  
            //arrRecipes = objAPIrecipes.hits;
            if(objAPIrecipes.count > 0){
                for(i=0; i<arrayLen; i++){
                    // only picking the fields i need from the api result
                    var objRecipeInfo = {
                        recipeName: objAPIrecipes.hits[i].recipe.label,
                        image: objAPIrecipes.hits[i].recipe.image,
                        directions: objAPIrecipes.hits[i].recipe.url,
                        arrIngredients: objAPIrecipes.hits[i].recipe.ingredients,
                        calories: objAPIrecipes.hits[i].recipe.calories
                    }

                    // set the values of the return array
                    arrSearchResult[i] = objRecipeInfo;    
                    console.log(objAPIrecipes.hits[i].recipe.label + "\n");
                }
            }
            if(arrSearchResult.length>=0){
                arrApiRecipes = arrSearchResult;
                resolve(arrSearchResult);
            }else{
                reject("Error loading fetching recipes via API");
            }
        }); 
    }); // end of promise
    
    getRecipePromise.then(function(arrReturn){
        console.log("return array type " + typeof(arrReturn));
        query = "SELECT * FROM recipe WHERE display = 1 AND recipeName LIKE "+ sql.escape('%'+strRecipeToSearch+'%');
        connection.query(query, function(err, result){
            console.log("Query: " + query);
            if(err){
                console.log("Error getting specific recipe, exited with error " + err);
            }else{
                myrecipes = result;
                
                //console.log(myrecipes);   
                res.render("Main_Menu", {
                    recipes: result,
                    arrRecipes: arrSearchResult,
                    emailResponse: JSON.stringify(0),
                    error: "",
                    loginID: req.session.userID
                });
            }    

        });
    }).catch(function(err){
        console.log("get recipe promise failed due to error " + err);
        res.render("Main_Menu", {
            recipes: [],
            arrRecipes: [],
            emailResponse: JSON.stringify(0),
            error: "",
            loginID: req.session.userID
        });
    }); 
    console.log("recipe to search = " + strRecipeToSearch);
});

app.post("/shareLink", [check('name', 'Senders name required!').isLength({min:2}),
check('email', 'Recipient email required!').isEmail(), check('recipeLink', 'recipe link required!').isLength({min:2})],
function(req, res){
    console.log("recipient: " + req.body.email + " Subj: " + req.body.name + " body: " + req.body.recipeLink);
    mailOptions.to = req.body.email;
    mailOptions.subject = "A Recipe Recommendation From " + req.body.name;
    mailOptions.text = req.body.recipeLink;

    const errors = validationResult(req);

    if(!errors.isEmpty()){
        console.log(errors.array());
        res.render("Main_Menu", {
            error: errors.array()
        });
    }else{
        // send email
        emailTransporter.sendMail(mailOptions, function(err, info){
            if(err){
                console.log("Error sending email, exited with error: " + err);
            }
            else{
                console.log("Email sent: " + info.response);
                blnShareLink = true;
                res.redirect("/");
            }
        });
    }
});


// pointers to route file
let recipe = require("./routes/recipe");

// middleware for all request that begins with '/recipe'
app.use('/recipe', recipe);

app.listen(3000, function(){
    console.log("Server started on port 3000 ....");
})