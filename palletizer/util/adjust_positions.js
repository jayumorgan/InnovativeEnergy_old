// In order to create a new pallet layout (arrangement of boxes and layers):
// A) go back to a safe baseline config
//  1. copy the value of j (to clipboard; without the last semicolon)
//  2. open a shell and do 'go_palletizer_db'
//  3. sqlite3 Configurations.sqlite3
//  4. update pallet_configs set raw_json='<here you paste what you copied in 1>' where id=1;
// B) edit your new pallet
//  1. start the application; edit your pallet normally; save it
// C) apply your offset
//  1. go back to sqlite3
//  2. select raw_json from pallet_configs where id=1;
//  3. copy the output to clipboard
//  4. replace j with that
//  5. run "node adjust_positions.js"
//  6. go back to sqlite3
//  7. same step as A.4

var j = {
	"config": {
		"name": "Pallet Configuration 2",
		"boxes": [
			{
				"name": "Box 1",
				"dimensions": {
					"width": 205,
					"length": 278,
					"height": 278
				},
				"pickLocation": {
					"x": 1519.96,
					"y": 830.05,
					"z": 940.0059900000001,
					"θ": 0
				}
			}
		],
		"pallets": [
			{
				"name": "Pallet 1",
				"corner1": {
					"x": 20.02,
					"y": 1070.03,
					"z": 1535.0053950000001,
					"θ": 0
				},
				"corner2": {
					"x": 20.02,
					"y": 20.02,
					"z": 1524.991545,
					"θ": 0
				},
				"corner3": {
					"x": 1009.97,
					"y": 20.02,
					"z": 1520.0042550000003,
					"θ": 0
				},
				"Layouts": [
					{
						"name": "Custom Layer 1",
						"boxPositions": [
							{
								"position": {
									"x": 0,
									"y": 0.7556451612903226
								},
								"box": {
									"name": "Box 1",
									"dimensions": {
										"width": 205,
										"length": 278,
										"height": 278
									},
									"pickLocation": {
										"x": 1519.96,
										"y": 830.05,
										"z": 940.0059900000001,
										"θ": 0
									}
								},
								"size": 620,
								"rotated": false
							},
							{
								"position": {
									"x": 0,
									"y": 0.5571069204679099
								},
								"box": {
									"name": "Box 1",
									"dimensions": {
										"width": 205,
										"length": 278,
										"height": 278
									},
									"pickLocation": {
										"x": 1519.96,
										"y": 830.05,
										"z": 940.0059900000001,
										"θ": 0
									}
								},
								"size": 620,
								"rotated": true
							},
							{
								"position": {
									"x": 0,
									"y": 0.2877520161290323
								},
								"box": {
									"name": "Box 1",
									"dimensions": {
										"width": 205,
										"length": 278,
										"height": 278
									},
									"pickLocation": {
										"x": 1519.96,
										"y": 830.05,
										"z": 940.0059900000001,
										"θ": 0
									}
								},
								"size": 620,
								"rotated": false
							},
							{
								"position": {
									"x": 0.2191777362493056,
									"y": 0.8104089254449497
								},
								"box": {
									"name": "Box 1",
									"dimensions": {
										"width": 205,
										"length": 278,
										"height": 278
									},
									"pickLocation": {
										"x": 1519.96,
										"y": 830.05,
										"z": 940.0059900000001,
										"θ": 0
									}
								},
								"size": 620,
								"rotated": true
							}
						],
						"height": 278
					}
				],
				"Stack": [
					0
				]
			}
		],
		"machine_config_id": 1
	},
	"boxCoordinates": [
		{
			"pickLocation": {
				"x": 1519.96,
				"y": 830.05,
				"z": 940.0059900000001,
				"θ": 0
			},
			"dropLocation": {
				"x": 122.5186992664946,
				"y": 137.60134497062415,
				"z": 1248.6670650000003,
				"θ": 0
			},
			"dimensions": {
				"width": 205,
				"length": 278,
				"height": 278
			},
			"palletIndex": 0,
			"stackIndex": 0,
			"linearPathDistance": 1589.8424412714296
		},
		{
			"pickLocation": {
				"x": 1519.96,
				"y": 830.05,
				"z": 940.0059900000001,
				"θ": 0
			},
			"dropLocation": {
				"x": 159.01823607846586,
				"y": 382.56682344416805,
				"z": 1248.6670650000003,
				"θ": 90
			},
			"dimensions": {
				"width": 205,
				"length": 278,
				"height": 278
			},
			"palletIndex": 0,
			"stackIndex": 0,
			"linearPathDistance": 1465.4949120711783
		},
		{
			"pickLocation": {
				"x": 1519.96,
				"y": 830.05,
				"z": 940.0059900000001,
				"θ": 0
			},
			"dropLocation": {
				"x": 122.5186992664946,
				"y": 628.8938263214305,
				"z": 1248.6670650000003,
				"θ": 0
			},
			"dimensions": {
				"width": 205,
				"length": 278,
				"height": 278
			},
			"palletIndex": 0,
			"stackIndex": 0,
			"linearPathDistance": 1445.191217252897
		},
		{
			"pickLocation": {
				"x": 1519.96,
				"y": 830.05,
				"z": 940.0059900000001,
				"θ": 0
			},
			"dropLocation": {
				"x": 375.9932360784659,
				"y": 116.5971851982265,
				"z": 1248.6670650000003,
				"θ": 90
			},
			"dimensions": {
				"width": 205,
				"length": 278,
				"height": 278
			},
			"palletIndex": 0,
			"stackIndex": 0,
			"linearPathDistance": 1383.0931042868503
		}
	]
};

function adjustPoint(p, offset) {
  p.x += offset.x;
  p.y += offset.y;
  p.z += offset.z;
}

var lMainOffset = {x: -90, y: 16.5, z: 170};
var lMainOffset_lowered = {x: -90, y: 16.5, z: 170 + 116};
j.config.boxes.forEach(function (b, ib) { adjustPoint(b.pickLocation, lMainOffset); });
j.config.pallets[0].Layouts[0].boxPositions.forEach(function (bp, ic) { adjustPoint(bp.box.pickLocation, lMainOffset); });
adjustPoint(j.config.pallets[0].corner1, lMainOffset_lowered);
adjustPoint(j.config.pallets[0].corner2, lMainOffset_lowered);
adjustPoint(j.config.pallets[0].corner3, lMainOffset_lowered);
j.boxCoordinates.forEach(function (bc, ic) {
  adjustPoint(bc.pickLocation, lMainOffset);
  adjustPoint(bc.dropLocation, (0 != bc.dropLocation.θ) ? {x:-90 + 16.5, y:2 * -16.5, z:170 + 116}/* slightly weird */ : lMainOffset_lowered);
});

console.log(JSON.stringify(j)); //, null, 2));
