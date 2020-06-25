#!/usr/bin/env python3

# functional version is sitting on the physical device.


box_width = 80
box_height = 50
center_box = box_width/2

x_max = 319.9
y_max = 377.8
z_max = 287.6

def get_demo_centroids():
    centroids = []
    # positional variables:
    print("Set the box height/width properly...")
    # box_width = 80
    # box_height = 50
    # center_box = box_width/2

    x_left = (x_max - 3*box_width) / 2

    current_x = x_left + center_box
    current_y = y_max
    current_z = z_max - box_height
    # first 6 are on the bottom.
    # These are the drop points
    place_index = 1
    # 6 boxes first row
    for i in range(6):
        item = {"x": current_x, "y": current_y, "z": current_z, "i":0}
        current_x = x_left + (place_index % 3) * box_width  + center_box
        if i == 2:
            current_z -= box_height
        centroids.append(item)
        place_index += 1

    # middle layer
    current_x = x_left + box_width
    current_y = y_max
    current_z -= box_height
    place_index = 1
    for i in range(4):
        item = {"x": current_x, "y": current_y, "z": current_z, "i":0}
        current_x = x_left + box_width*(place_index % 2)
        if i == 1:
            current_z -= box_height
        centroids.append(item)
        place_index += 1
    
    # for the last two boxes:
    current_x = x_left + box_width + center_box
    current_z -= box_height
    for i in range(2):
        item = {"x": current_x, "y": current_y, "z": current_z, "i":0}
        current_z -= box_height
        centroids.append(item)

    return centroids

def get_demo_pickups():
    pickups = []
    x_left = (x_max - 3*box_width) / 2
    x_current = center_box
    y_current = 0
    z_max = 287.6
    z_current = z_max - box_height
    # Three stacks of height = 4
    for i in range(12):
        item = {"x": x_current, "y": y_current, "z": z_current}
        # print(i)
        if (i+1) % 4 == 0:
            z_current -= box_height

        x_current = (i + 1 % 3) * x_left + center_box
        pickups.append(item)

    return pickups
