var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
mongoose.connect("mongodb://localhost/allTheNews", { useNewUrlParser: true });

// Routes

app.get("/", function (req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function (data) {
      // If we were able to successfully find Articles, send them back to the client
      var hbsObject = {
        Articles: data
      };
      console.log(hbsObject);
      res.render("index", hbsObject);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});
// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://www.sfchronicle.com/").then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $("div.prem-hl-item ").each(function (i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children("h2")
        .children("a")
        .text();
      result.link = $(this)
      .children("h2")
      .children("a")
      .attr("href")
      .substr(12);
      result.img = $(this)
      .children("div.img-wrap")
      .children("a")
      .children("img")
      .attr("src")
      result.alt = $(this)
      .children("h2")
      .children("a")
      .text();
      result.blurb = $(this)
      .children("p.blurb")
      .children("span")
      .text();
      // Create a new Article using the `result` object built from scraping
      // result.blurb = (result.blurb).substr(12);

      if((result.link.startsWith("http")) == false) {
        result.link = `https://www.sfchronicle.com/${result.link}`
      };
      // if(result.link.contains("https")){

      // }else if {
      //   result.link = baseURL + result.link
      // }

      db.Article.create(result)
        .then(function (dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function (err) {
          // If an error occurred, log it
          console.log(err);
        });
    });

    // Send a message to the client
    res.send("Scrape Complete");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function (dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("comment")
    .then(function (dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/submit", function(req, res) {
  // Create a new Book in the database
  db.Comment.create(req.body)
    .then(function(dbComment) {
      // If a Comment was created successfully, find one library (there's only one) and push the new Comment's _id to the Library's `comment` array
      // { new: true } tells the query that we want it to return the updated Library -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate(id==this.id, { $push: { comment: dbComment._id } }, { new: true });
    })
    .then(function(dbArticle) {
      // If the Article was updated successfully, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurs, send it back to the client
      res.json(err);
    });
});

app.delete("/delete", function(req, res) {
  db.Comment.deleteMany({}, function (err) {});
  db.Article.deleteMany({}, function (err) {});

})

// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
