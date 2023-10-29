// this visualization was inspired by
// Team Triple Treat course project
// http://ustimeuse.github.io/
// and Nathan Yau's https://flowingdata.com

var USER_SPEED = "fast";

var speeds = { "slow": 1200, "medium": 400, "fast": 50 };
var simtimer;

var margin = {top: 70, right: 60, bottom: 70, left: 60};
margin.left = margin.right = width < 500 ? 30 : 70;
var width = parseInt(d3.select("#chart").style('width'), 10) - margin.left - margin.right,
    height = 670 - margin.top - margin.bottom,
    padding = 2,
    maxRadius = width < 500 ? 2 : 4;

// Scales
var x = d3.scale.linear()
    .domain([1, 3])
    .range([0, width]);

var y = d3.scale.linear()
    .domain([1, 4])
    .range([0, height]);

var sched_objs = [],
    curr_minute = 0;

// Configuration object
const config = {
    eating: { x: 1, y: 3.5, label: "Eating" },
    leisure: { x: 2.8, y: 2.5, label: "Leisure" },
    sleeping: { x: 2, y: 3.5, label: "Sleeping" },
    traveling: { x: 2, y: 2.5, label: "Traveling" },
    work: { x: 1.2, y: 2.5, label: "Work" },
    housework: { x: 2.5, y: 1.2, label: "Shopping" },
    care: { x: 1.5, y: 1.2, label: "Housework & Care" },
    other: { x: 3, y: 3.5, label: "Other" }
};

// Define foci using the configuration
var foci = {};
const activityMappings = {
    "110000": "eating", "120000": "leisure", "10000": "sleeping",
    "10101": "sleeping", "180000": "traveling", "50000": "work",
    "20000": "housework", "30000": "care", "40000": "care",
    "60000": "work",
    "130000": "other", "70000": "other", "80000": "other",
    "140000": "other", "150000": "other", "160000": "other",
    "511111": "other"
};
for (const [code, activity] of Object.entries(activityMappings)) {
    const { x: cx, y: cy } = config[activity];
    foci[code] = { x: x(cx), y: y(cy), grp: activity };
}

// Define grpcnts using the configuration
var grpcnts = {};
for (const [activity, {x: cx, y: cy, label}] of Object.entries(config)) {
    grpcnts[activity] = { m: 0, f: 0, label, x: cx, y: cy };
}


var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


d3.tsv("https://raw.githubusercontent.com/Kolpashnikova/random/master/ttus1.tsv", function(error, data) {

    data.forEach(function(d) {
        var day_array = d.day.split(",");
        var activities = [];
        for (var i=0; i < day_array.length; i++) {
            // Duration
            if (i % 2 == 1) {
                activities.push({'act': day_array[i-1], 'duration': +day_array[i]});
            }
        }
        sched_objs.push(activities);
    });


    var nodes = sched_objs.map(function(o,i) {

        var act = o[0].act;
        var init_x = foci[act].x + Math.random();
        var init_y = foci[act].y + Math.random();
        // var col = data[i].sex == "m" ? "#f5b170" : "#89f0ec";

        grpcnts[foci[act].grp][data[i].sex] += 1;

        return {
            act: act,
            radius: maxRadius,
            x: init_x,
            y: init_y,
            sex: data[i].sex,
            color: color(act, data[i].sex),
            moves: 0,
            next_move_time: o[0].duration,
            sched: o,
        }
    });

    var force = d3.layout.force()
        .nodes(nodes)
        .size([width, height])
        // .links([])
        .gravity(0)
        .charge(0)
        .friction(.9)
        .on("tick", tick)
        .start();

    var circle = svg.selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", function(d) { return d.radius; })
        .style("fill", function(d) { return d.color; });

    var actlabel = svg.selectAll("text")
        .data(d3.keys(grpcnts))
        .enter().append("text")
        .attr("class", "actlabel")
        .attr("text-anchor", "middle")
        .attr("x", d => x(grpcnts[d].x))
        .attr("y", d => y(grpcnts[d].y))
        .attr("dy", "-1.8em")
        .text(d => grpcnts[d].label)

    var fcntlabel = svg.selectAll(".fcntlabel")
        .data(d3.keys(grpcnts))
        .enter().append("g")
        .attr("class", "fcntlabel")
        .attr("transform", d => "translate("+(x(grpcnts[d].x)-40)+","+y(grpcnts[d].y)+")");
    fcntlabel.append("text")
        .attr("class", "cnt")
        .attr("text-anchor", "middle")
        .text(d => (total = grpcnts[d].f+grpcnts[d].m) == 0 ? "0%" :
        readablePercent(grpcnts[d].f, total));
    fcntlabel.append("text")
        .attr("class", "sublabel")
        .attr("text-anchor", "middle")
        .attr("y", "1.2em")
        .text("Women");


    var mcntlabel = svg.selectAll(".mcntlabel")
        .data(d3.keys(grpcnts))
        .enter().append("g")
        .attr("class", "mcntlabel")
        .attr("transform", d => "translate("+(x(grpcnts[d].x))+","+y(grpcnts[d].y)+")");
    mcntlabel.append("text")
        .attr("class", "cnt")
        .attr("text-anchor", "middle")
        .text(d => (total = grpcnts[d].f+grpcnts[d].m) == 0 ? "0%" :
        readablePercent(grpcnts[d].m, total));
    mcntlabel.append("text")
        .attr("class", "sublabel")
        .attr("text-anchor", "middle")
        .attr("y", "1.2em")
        .text("Men");

    // total number labels
    var tlabel = svg.selectAll(".tlabel")
        .data(d3.keys(grpcnts))
        .enter().append("g")
        .attr("class", "tlabel")
        .attr("transform", d => "translate("+(x(grpcnts[d].x)+50)+","+y(grpcnts[d].y)+")");
    tlabel.append("text")
        .attr("class", "cnt")
        .attr("text-anchor", "middle")
        .text(d => (total = grpcnts[d].f+grpcnts[d].m) == 0 ? "0%" :
        readablePercent(grpcnts[d].f+grpcnts[d].m, 800));
    tlabel.append("text")
        .attr("class", "sublabel")
        .attr("text-anchor", "middle")
        .attr("y", "1.2em")
        .text("Total");



    function timer() {
        d3.range(nodes.length).map(function(i) {

            if (nodes[i].next_move_time == curr_minute) {
                if (nodes[i].moves == nodes[i].sched.length-1) {
                    nodes[i].moves = 0;
                } else {
                    nodes[i].moves += 1;
                }

                grpcnts[ foci[nodes[i].act].grp ][nodes[i].sex] -= 1;

                // Move on to next activity
                nodes[i].act = nodes[i].sched[ nodes[i].moves ].act;

                grpcnts[ foci[nodes[i].act].grp ][nodes[i].sex] += 1;

                nodes[i].next_move_time += nodes[i].sched[ nodes[i].moves ].duration;
            }

        });

        force.resume();
        curr_minute += 1;

        fcntlabel.selectAll("text.cnt")
            .text(d => (total = grpcnts[d].f+grpcnts[d].m) == 0 ? "0%" :
            readablePercent(grpcnts[d].f, total));
        mcntlabel.selectAll("text.cnt")
            .text(d => (total = grpcnts[d].f+grpcnts[d].m) == 0 ? "0%" :
            readablePercent(grpcnts[d].m, total));
        tlabel.selectAll("text.cnt")
            .text(d => (total = grpcnts[d].f+grpcnts[d].m) == 0 ? "0" :
            readablePercent(grpcnts[d].f+grpcnts[d].m, 800));


        var true_minute = curr_minute % 1440;
        d3.select("#current_time").text(minutesToTime(true_minute));

        if (USER_SPEED != "pause") {
            simtimer = setTimeout(timer, speeds[USER_SPEED]);
        }

     }

    timer();



    function tick(e) {
        var k = 0.03 * e.alpha;

        nodes.forEach(function(o, i) {
            var curr_act = o.act;

            // Make sleep more sluggish moving.
            if (curr_act == "10101") {
                var damper = 0.6;
            } else {
                var damper = 1;
            }
            o.color = color(curr_act, o.sex);

            o.y += (foci[curr_act].y - o.y) * k * damper;
            if (o.sex == "m") {
                o.x += (foci[curr_act].x+width*.01 - o.x) * k * damper;
            } else {
                o.x += (foci[curr_act].x-width*.01 - o.x) * k * damper;
            }

        });

        circle
            .each(collide(.5))
            .style("fill", function(d) { return d.color; })
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
    }

    function collide(alpha) {
        var quadtree = d3.geom.quadtree(nodes);
        return function(d) {
            var r = d.radius + maxRadius + padding,
                nx1 = d.x - r,
                nx2 = d.x + r,
                ny1 = d.y - r,
                ny2 = d.y + r;
            quadtree.visit(function(quad, x1, y1, x2, y2) {
                if (quad.point && (quad.point !== d)) {
                    var x = d.x - quad.point.x,
                        y = d.y - quad.point.y,
                        l = Math.sqrt(x * x + y * y),
                        r = d.radius + quad.point.radius + (d.act !== quad.point.act) * padding;
                    if (l < r) {
                        l = (l - r) / l * alpha;
                        d.x -= x *= l;
                        d.y -= y *= l;
                        quad.point.x += x;
                        quad.point.y += y;
                    }
                }
                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
        };
    }



   d3.selectAll(".togglebutton")
        .on("click", function() {
            if (d3.select(this).attr("data-val") == "pause") {
                d3.select(".pause").classed("current", true);
                d3.select(".medium").classed("current", false);
                d3.select(".fast").classed("current", false);
            } else if (d3.select(this).attr("data-val") == "medium") {
                d3.select(".pause").classed("current", false);
                d3.select(".medium").classed("current", true);
                d3.select(".fast").classed("current", false);
            } else {
                d3.select(".pause").classed("current", false);
                d3.select(".medium").classed("current", false);
                d3.select(".fast").classed("current", true);
            }

            force.resume();
            clearTimeout(simtimer);
            USER_SPEED = d3.select(this).attr("data-val");

            if (USER_SPEED != "pause") timer();
        });
});



function color(activity, sex) {

    if (sex == "m") {
        var colorByActivity = {
            "10101": "#bbbbbb",
            "10000": "#bbbbbb",
            "20000": "#8e9fff",
            "30000": "#1d53bc",
            "40000": "#1d53bc",
            "50000": "#bbbbbb",
            "60000": "#bbbbbb",
            "70000": "#bbbbbb",
            "80000": "#bbbbbb",
            "110000": "#bbbbbb",
            "120000": "#bbbbbb",
            "130000": "#bbbbbb",
            "140000": "#bbbbbb",
            "150000": "#bbbbbb",
            "160000": "#bbbbbb",
            "511111": "#bbbbbb",
            "180000": "#bbbbbb"
        };
    } else {
        var colorByActivity = {
            "10101": "#bbbbbb",
            "10000": "#bbbbbb",
            "20000": "#b9ff87",
            "30000": "#22bc11",
            "40000": "#22bc11",
            "50000": "#bbbbbb",
            "60000": "#bbbbbb",
            "70000": "#bbbbbb",
            "80000": "#bbbbbb",
            "110000": "#bbbbbb",
            "120000": "#bbbbbb",
            "130000": "#bbbbbb",
            "140000": "#bbbbbb",
            "150000": "#bbbbbb",
            "160000": "#bbbbbb",
            "511111": "#bbbbbb",
            "180000": "#bbbbbb"
        };
    }

    return colorByActivity[activity];

}



// Output readable percent based on count.
function readablePercent(n, total) {

    var pct = 100 * n / total;
    if (pct < 1 && pct > 0) {
        pct = "<1%";
    } else {
        pct = Math.round(pct) + "%";
    }

    return pct;
}


// Minutes to time of day. Data is minutes from 4am.
function minutesToTime(m) {
    var minutes = (m + 0*60) % 1440;
    var hh = Math.floor(minutes / 60);
    var ampm;
    if (hh > 12) {
        hh = hh - 12;
        ampm = "pm";
    } else if (hh == 12) {
        ampm = "pm";
    } else if (hh == 0) {
        hh = 12;
        ampm = "am";
    } else {
        ampm = "am";
    }
    var mm = minutes % 60;
    if (mm < 10) {
        mm = "0" + mm;
    }

    return hh + ":" + mm + ampm
}

// For SVG text-wrapping
function wrap(text, width) {
    text.each(function() {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            x = text.attr("x"),
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }
    });
}