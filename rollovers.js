
function setupRollovers() {
	var img, sh, sn, sd
	for (var i = 0; (img = document.images[i]); i++) {
		if (img.getAttribute) {

			sn = img.getAttribute("src");
			sh = img.getAttribute("hsrc");
			sd = img.getAttribute("dsrc");

			if (sn != "" && sn != null) {
				img.n = new Image();
				img.n.src = img.src;
			
				if (sh != "" && sh != null) {
					img.h = new Image();
					img.h.src = sh;
					img.onmouseover = soopaSwapOn
					img.onmouseout  = soopaSwapOff
				}

				if (sd != "" && sd != null) {
					img.d = new Image();
					img.d.src = sd;
					img.onmousedown = soopaSwapDown
				}
			}
		}
	}
}

function soopaSwapOn() {
	this.src = this.h.src;
}

function soopaSwapOff() {
	this.src  = this.n.src;
}

function soopaSwapDown() {
	this.src  = this.d.src;
	this.temp = typeof(document.onmouseup) != 'undefined' && typeof(document.onmouseup) != 'unknown' ? document.onmouseup : "";
	soopaSwapUp.img = this;
	document.onmouseup = soopaSwapUp;
}

function soopaSwapUp() {
	var ths = soopaSwapUp.img;
	ths.src = ths.n.src;
	if (ths.temp) document.onmouseup = ths.temp;
}