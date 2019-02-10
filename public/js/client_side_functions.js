// function sendEmail(){
//     //alert("Ajax called");

//     var name = document.getElementById("yourName").value;
//     var recipient = document.getElementById("friendsEmail").value;
//     var message = document.getElementById("linkArea").value;

//     if(name == "" || recipient =="" || message ==""){
//         alert("Missing one the following fields:\n" + "your name\nrecipient's email\nthe recipe link");
//         return;
//     }

//     //document.getElementById("shareRecipeForm").submit();
//     $.ajax({
//         url:"/shareLink",
//         method: "POST",
//         datatype: "json",
//         data : {
//            email: $("#friendsEmail").val(),
//            recipeLink: $("#linkArea").val(),
//            name: $("#yourName").val() 
//         },
//         cache : false,
//         // success : function (data) {
//         //     //alert("success from ajax call " + data.success);
//         //     if(data.success){
//         //        // alert("in success if statement!");
//         //         document.getElementById("email_response").innerHTML = "Recipe shared!";
//         //         $(".dialog").dialog({position:{my:"center", at:"center", of: window}});
//         //     }
//         // },
//         error : function () {
//             // some error handling part
//             alert("Oops! Something went wrong.");
//         }
//     });
// }
function search(){
    document.getElementById("searchBox").value = strCountry;
    // alert("Country = " + strCountry);
    // console.log("Country = " + strCountry);
    document.getElementById("searchForm").submit();
}

function shareRecipe(){
    var name = document.getElementById("yourName").value;
    var recipient = document.getElementById("friendsEmail").value;
    var message = document.getElementById("linkArea").value;

    if(name!="" && recipient!="" && message!=""){
        document.getElementById("shareRecipeForm").submit();
    }
    else{
        alert("Missing one the following fields:\n" + "your name\nrecipient's email\nthe recipe link");
        return;
    }
    
}
