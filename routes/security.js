/* Security handling */
function SecurityHandler (pgConnectionString) {
	var localmode = pgConnectionString.search('localhost') != -1;

    this.requireHTTPSMiddleware = function(req, res, next) {    	
		if (!localmode ) { 
			if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] === "http") {
				console.log("Caught request over http. Redirecting to: " + "https://" + req.headers.host + req.url);
				return res.redirect("https://" + req.headers.host + req.url);
			}
		} 
		return next();	
    }
    
    this.requirePostHeadersMiddleware = function(req, res, next) {
    	if (req.method == 'POST') {
    		res.header('X-Frame-Options', 'Deny');
    		res.header('Cache-control' , 'no-store' );
    		res.header('Pragma' , 'no-cache' );
    	}
    	return next();
    }
}

module.exports = SecurityHandler;
