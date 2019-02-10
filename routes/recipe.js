const express = require("express"); // load the express module or import the express library
const { check, validationResult } = require('express-validator/check');
const sql = require("mysql");
const dbConfig = require("../db_config.js");
const path = require('path');
const bodyParser = require("body-parser"); 
let connection = sql.createConnection(dbConfig);
const session = require('express-session');
const htmlToplain = require("html2plaintext");
const router = express.Router();
router.use(session({ secret: 'keyboard cat'}));

// Body parser for retrieving json objects
router.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
router.use(bodyParser.json());


// POST Request
// use passport to do this authentication
router.post("/authenticate", [check('inputUserName', 'user name required!').isLength({min:2}),
check('inputPassword', 'password required!').isLength({min:1}), check('email', 'Invalid Email!').isEmail()], 
function(req, res){
    const errors = validationResult(req);

    if(!errors.isEmpty()){
        console.log(errors.array());
        res.render("login", {
            error: errors.array()
        });
    }
    else{
        var userName = req.body.inputUserName;
        var password = req.body.inputPassword;
        var email = req.body.email;
        var query = "SELECT * FROM users WHERE username = " + sql.escape(userName);
        connection.query(query, function(err, result){
            console.log("result value: " + typeof(result) );
            if(err){
                console.log(err);
            }
            else if(Object.keys(result).length == 0){
                //console.log(errorMessages[0].noUser);
                res.render("login", {
                    error: "User does not exist"
                });
                return;
            }
            else if(result[0].password !== password){
                // console.log("pword:" + result[0].password);
                //console.log("password: " + result.password);   
                res.render("login", {
                    error: "Invalid password"
                });
                return;
            }
            else if(result[0].email !== email){
                res.render("login", {
                    error: "Invalid email"
                });
                return;
            }
            else{
                req.session.userID = result[0].userID;
                console.log("pword:" + result[0].userID);
                res.redirect("/");
                // res.render("Main_Menu", {recipes: myrecipes});
                console.log(result);
            }
        });
        //console.log("Name: " + userName + " password: " + password + " Email: " + email); 
    }
});

// add recipe to database
router.post("/addRecipe", [check('recipeName', 'Recipe name required!').isLength({min:2}),
check('country', 'Country required!').isLength({min:1}), check('calories', 'calories required!'), check('instructions', 'Instructions required!').isLength({min:1}),
check('photo', 'Photo link required!').isLength({min:1}),
check('ingredients', 'Ingredients required!').isLength({min:1})],
function(req, res){
    const errors = validationResult(req);

    if(!errors.isEmpty()){
        console.log(errors.array());
        res.render("add_recipe", {
            errors: errors.array()
        })
    }
    else{

        var recipeName = req.body.recipeName;
        var countryOfRecipe = req.body.country;

        var newCountry = {
            countryname: countryOfRecipe.toUpperCase(),
            userID: req.session.userID
        }        
        // sets the global existingCountryID variable 
    
        var newRecipe = {
            recipeName: recipeName,
            calories: req.body.calories,
            countryID: "",
            userID: req.session.userID,
            Ingredients: req.body.ingredients,
            photoURL: req.body.photo,
            steps: req.body.instructions,
            display: "1"
        };    

        //console.log("Existing Country ID: " + existingCountryID);

        if(recipeExist(recipeName, countryOfRecipe)){
            res.render("add_recipe", {
                error: "Recipe already exist!"
            });
        }
        else{
            var newCountryID = "";
            query = "SELECT * FROM recipecountry WHERE countryname = " + sql.escape(countryOfRecipe);
            console.log("Query: " + query);
            connection.query(query, function(err, result){
                if(err){
                    console.log("error fetching country: " + err);
                }
                else if(Object.keys(result).length <= 0){
                    console.log("No row returned");
                    //existingCountryID = -1;
                    query = "INSERT INTO recipecountry SET ?";
                    connection.query(query, newCountry, function(err, result){
                        if(err){
                            console.log("Error: source: add recipe message: " + err);
                        }
                        else{
                            console.log("CountryID in country insertion : " + newCountryID);
                            // set the country to the new inserted country
                            newRecipe.countryID = result.insertId;    
                            query = "INSERT INTO recipe SET ?";
                            connection.query(query, newRecipe, function(err, result){
                                if(err){
                                    console.log("userID: " + req.session.userID + " countryID: " + newRecipe.countryID);
                                    console.log("error inserting new recipe with message: " + err);
                                }else{
                                    console.log("inserting new recipe with userID: " + req.session.userID + " and countryID: " + newRecipe.countryID);
                                    res.redirect("/");
                                }
                            });
                        }
                    });
                } // else statement for country that doesn't exist
                else{
                    // set the countryID to the existing country in the database
                    newRecipe.countryID = result[0].countryID;
                    query = "INSERT INTO recipe SET ?";
                    connection.query(query, newRecipe, function(err, result){
                        if(err){
                            console.log("userID: " + req.session.userID + " countryID: " + newRecipe.countryID);
                            console.log("error inserting new recipe with message: " + err);
                        }else{
                            console.log("inserting new recipe with userID: " + req.session.userID + " and countryID: " + newRecipe.countryID);
                            res.redirect("/");
                        }
                    });
                
                }
            });  // recipe insertion 

        } // recipe doesn't exist

    } // no error during validation of new recipe instructions
});

router.post("/editRecipe", function(req, res){
    // console.log("In editRecipe, recipeID = " + req.body.recipeID);
    query = "SELECT recipeName, countryname, calories, Ingredients, steps FROM recipe " + "\n" + 
            " INNER JOIN recipecountry on (recipe.countryID = recipecountry.countryID)" + "\n" + 
            " WHERE recipeID = " + sql.escape(req.body.recipeID); 
    
    //console.log("In getRecipe, RecipeID = " + recipeID);
    connection.query(query, function(err, result){
        //console.log("recipeExist: " + result + "type of result " + typeof(result));
        if(err){
            console.log("Error: source: getRecipe, Message: " + err);
        }
        else if( (Object.keys(result).length <= 0) ){
            console.log("recipe doesn't exist for ID = " + recipeID);
            // arrReturn[0] = result;
        }
        else if(result[0].countryname !== req.body.country){
            var newCountry = {
                countryname: req.body.country.toUpperCase(),
                userID: req.session.userID
            }
        
            query = "INSERT INTO recipecountry SET ?";
            connection.query(query, newCountry, function(err, result){
                if(err){
                    console.log("Error: source: add recipe message: " + err);
                }
                else{
                    newCountryID = result.insertId;
                    var updateObj = [req.body.recipeName,req.body.calories,newCountryID,req.body.ingredients,req.body.instructions, req.body.recipeID];
                    query = "UPDATE recipe SET recipeName = ?, calories =?, countryID =?, Ingredients =?, steps =? WHERE recipeID =? ";
                    connection.query(query, updateObj, function(err, result){
                        console.log("update recipe: " + result + "type of result " + typeof(result));
                        if(err){
                            console.log("Error: source: editRecipe, Message: " + err);
                        }
                        else{
                            res.redirect("/");   
                        }
                    });
                }
            });
        }else if(result[0].countryname === req.body.country){
            console.log("edited ingredient: \n" + htmlToplain(req.body.instructions));
            var updateObj = [req.body.recipeName,req.body.calories,req.body.ingredients,req.body.instructions,req.body.recipeID];
            query ='UPDATE recipe SET recipeName = ?, calories =?, Ingredients =?, steps = ? WHERE recipeID =?';
            connection.query(query, updateObj, function(err, result){
                console.log("Update recipe, same country  " + result + " type of result " + typeof(result));
                if(err){
                    console.log("Error: source: update, same country, error message: " + err);
                }
                else{
                    res.redirect("/");   
                }
            });
        }
    });   
});

// used to check if a recipe already exist
function recipeExist(recipeName, country){
    query = "SELECT recipeName, countryname FROM recipe " + "\n" + 
            " INNER JOIN recipecountry on (recipe.countryID = recipecountry.countryID)" + "\n" + 
            " WHERE recipeName = " + sql.escape(recipeName);

    connection.query(query, function(err, result){
        console.log("recipeExist: " + result + "type of result " + typeof(result));
        if(err){
            console.log("Error: source: recipeExist Message: " + err);
        }
        else if( (Object.keys(result).length > 0) && 
                (result[0].countryname.toLowerCase() === country.toLowerCase()) ){
            //console.log("recipeExist: " + result);
            return true;
        }
        else{
            console.log("recipeExist: " + result + "type of result " + typeof(result));
            return false;
        }
    });

   // console.log("Query: " + actualQuery);

}
// add new user to the database
router.post("/registerUser", [check("inputUserName", "Username required!").isLength({min:2}), check("email", "Invalid email!").isEmail(),
check("inputPassword", "Password required!").isLength({min:1}), 
check("inputPassword2", "Confirmed required!").isLength({min:1}).custom(function(value, {req, location, path}){
    if(value !== req.body.inputPassword){
        throw new Error("passwords don't match!");
    }else{
        return value;
    }
})],
function(req, res){
    const errors = validationResult(req);
    
    if(!errors.isEmpty()){
        res.render("registerUser", {
            errors: errors.array()
        });
    }
    else{
        var password = req.body.inputPassword;
        var username = req.body.inputUserName;
        var email = req.body.email;

        var user = {
            username: username,
            password: password,
            email: email
        };
        query = "INSERT INTO users SET ?";
        connection.query(query, user, function(err, result){
           if(err){
                console.log("Error inserting new user with message" + err);  
           }
           else{
                req.session.userID = result.insertId;
                res.redirect("/");
           }     

        });   
        console.log("password: " + password + " username: " + username + " email " + email);
    }    


});

module.exports = router;