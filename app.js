var express                 = require('express');
var app                     = express();
var bodyParser              = require("body-parser");
var mongoose                = require("mongoose");
var passport                = require("passport");
var LocalStrategy           = require("passport-local");
var passportLocalMongoose   = require("passport-local-mongoose");
var methodOverride          = require("method-override");
var multer                  = require('multer');
var User                    = require("./models/user");
var Skill              = require("./models/skill");
var Idea                    = require("./models/idea");


mongoose.connect("mongodb://localhost/portal1");
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));

//MULTER CONFIGURATION
var storage = multer.diskStorage({
  destination: function(req, file, callback) {
    callback(null, './public/uploads');
  },
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter}).single('image');


// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "The Key",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    next();
});


// Root route
app.get("/", function(req, res){
    res.render("landing");
});

// Members Area
app.get("/members", isLoggedIn,function(req, res){
	//console.log(req);
    res.render("memarea");
});

//Show user data
app.get("/members/:id", isLoggedIn, function(req, res){
    User.findById(req.params.id).populate("skill").exec(function(err, user){
        if(err){
            console.log(err);
        }else{
            // console.log(user);
            res.render("userdata", {user: user});
        }
    });
});

//EDIT User Info
app.get("/members/:id/edit", isLoggedIn,function(req, res){
    User.findById(req.params.id, function(err, foundUser){
        if(err){
            res.redirect("/members");
        }else{
            res.render("edituser", {user: foundUser});
        }
    });
});

//UPDATE User Info
app.put("/members/:id", isLoggedIn,function(req, res){
    User.findByIdAndUpdate(req.params.id, req.body.user, function(err, foundUser){
        if(err){
            res.redirect("/members");
        }else{
            res.redirect("/members/" + req.params.id);
        }
    });
});



//===========================
// EDUCATION ROUTES
//===========================

// NEW Education page
app.get("/members/:id/task", isLoggedIn, function(req, res){
    //find user by id
    User.findById(req.params.id, function(err, user){
        if(err){
            console.log(err);
        }
        else{
           
            res.render("task",{user:user})
        }
    });
});
app.post("/members/:id/task", isLoggedIn, function(req, res){
    //find user by id
    User.findById(req.params.id, function(err, user){
        if(err){
            console.log(err);
        }
        else{
           
            abcd=[]
            count=0;
            for (key in req.body)
            {
                count++;
                if(count>1)
                abcd.push(req.body[key])
            }
            var idea = new Idea();
            idea.idea=req.body.a;
            idea.skill=abcd;
            idea.save(function(err,idea)
            {
                if(err)
                    res.send('errorin idea');
                else{
                    User.find().exec(function(err, user){
                        if(err){
                            console.log('there is an error dude');
                        }else{
                            console.log(user);

                        }
                    });
                }
            });

            
        }
    });
});
app.get("/members/:id/skill/new", isLoggedIn, function(req, res){
    //find user by id
    User.findById(req.params.id, function(err, user){
        if(err){
            console.log(err);
        }
        else{
           
            res.render("newedu", {user: user});
        }
    });
});

// CREATE Education and add to user
app.post("/members/:id/skill/", isLoggedIn, function(req, res){
    User.findById(req.params.id, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/members");
        }
        else{
            Skill.create(req.body, function(err, skill){
                if(err){
                    console.log(err);
                }
                else{
                    skill.save();
                    // add username and id to comment
                    user.skill.push(skill._id);
                    user.save();
                    //console.log(user);
                    res.redirect("/members/" + user._id);
                }
            });
        }
    });
});
//DESTROY Education route
app.delete("/members/:id/skill/:skill_id", isLoggedIn, function(req, res){
    Skill.findByIdAndRemove(req.params.skill_id, function(err){
        if(err){
            res.redirect("back");
        }else{
            res.redirect("/members/" + req.params.id);
        }
    });
});


//===========================
// WORK ROUTES
//===========================




//===========================
//      AUTH ROUTES
//===========================

// show register form
app.get("/register", function(req, res){
    res.render("register");
});

// handle signup logic
app.post("/register", function(req, res){
    upload(req, res, function(err) {
		//console.log(req.file);
        if(err) {
            return res.send("Error uploading file.");
        }
        if(typeof req.file !== "undefined") {
            var image = '/uploads/' + req.file.filename;
        } else {
            var image = '/uploads/no-image.png';
        }
        var newUser = new User(
            {
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                image: image,
                email: req.body.email,
                phone: req.body.phone,
                username: req.body.username,
            });
        User.register(newUser, req.body.password, function(err, user){
            if(err)
            {
                console.log(err);
                return res.render("register");
            }
            passport.authenticate("local")(req, res, function(){
            	  //console.log(req);
                // console.log(user);
                res.redirect("/members");
            });
        });
    });
});


// show login form
app.get("/login", function(req, res){
    res.render("login");
});

// handle login logic
app.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/members",
        failureRedirect: "/login"
    }), function(req, res){
});

// logout route
app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});


// middleware
function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.render("login");
}

app.listen(process.env.PORT || 3000, process.env.IP, function(){
    console.log("Portal Server Started!!!");
});