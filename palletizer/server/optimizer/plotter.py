import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import mpl_toolkits.mplot3d.art3d as art3d
import matplotlib.animation as animation
import json
from matplotlib.patches import Circle
import sys
import numpy as np


def load_data(id):
    with open(f"../path_data/{id}actiondata3d.json") as reader:
        return json.load(reader)


def generate_plots_for_path(data):
    xs = []
    ys = []
    zs = []
    for d in data:
        if d == None:
            continue
        for point in d:
            x = point["x"]
            y = point["y"]
            z = point["z"]
            xs.append(x)
            ys.append(y)
            zs.append(z)
    return [xs, ys, zs]


def get_point_from_path(path, path_index):
    point = path[path_index]
    x = point["x"]
    y = point["y"]
    z = point["z"] * -1
    return [x, y, z]


def join_return_paths(data):
    index = 0
    new_data = []
    print(len(data))
    if len(data) > 0:
        new_data.append(data[0])
        index += 1
    while index < len(data) - 1:
        forward = data[index]
        backward = data[index + 1]
        if True:
            forward.extend(backward)
        new_data.append(forward)
        index += 2
    return new_data


def main(id):

    print(f"Plotting coordinate for pallet configuration {id}")
    loaded = load_data(id)
    data = join_return_paths(loaded["paths"])
    print(loaded["paths"])
    constraints = loaded["constraints"]
    [xs, ys, zs] = generate_plots_for_path(data)
    xs = np.array(xs)
    ys = np.array(ys)
    zs = np.array(list(map(lambda x: -1 * x, zs)))

    # Plot with different colors.
    # What is happenening with the raise then return.
    data_count = 0
    path_count = 0

    x_points = np.array([])
    y_points = np.array([])
    z_points = np.array([])

    fig = plt.figure()
    ax = fig.add_subplot(111, projection='3d')
    title = ax.set_title(f"Path plot for pallet_config_id = {id}")
    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Z')
    graph, = ax.plot(xs, ys, zs)

    def update_graph(num):
        nonlocal path_count
        nonlocal data_count
        nonlocal x_points
        nonlocal y_points
        nonlocal z_points
        nonlocal graph

        # Also get the return path in a single shot.
        if path_count >= len(data[data_count]):
            if data_count < len(data):
                data_count += 1
                path_count = 0
                graph, = ax.plot(xs, ys, zs)
                x_points = np.array([])
                y_points = np.array([])
                z_points = np.array([])
        if data_count < len(data):
            [x, y, z] = get_point_from_path(data[data_count], path_count)

            print(f"index={num}, ({x}, {y}, {z})")
            x_points = np.append(x_points, [x])
            y_points = np.append(y_points, [y])
            z_points = np.append(z_points, [z])
            graph.set_data(x_points, y_points)
            graph.set_3d_properties(z_points)

        path_count += 1
        # add_constraint(num)

    time_interval = 200
    animator = animation.FuncAnimation(fig,
                                       update_graph,
                                       len(xs),
                                       interval=time_interval,
                                       blit=False,
                                       repeat=False)

    def add_constraint(num):

        if num == 0:
            c = constraints[num]
            x = c["x"]
            y = c["y"]
            z = c["z"]
            z *= -1  # reverse for top.
            r = c["radius"]
            p = Circle((x, y), r, alpha=0.5, fc="red", ec="black")

            ax.add_patch(p)
            art3d.pathpatch_2d_to_3d(p, z=z, zdir="z")

    for k in range(len(constraints)):
        add_constraint(k)


# p = Circle((100, 100), 100)
# ax.add_patch(p)
# art3d.pathpatch_2d_to_3d(p, z=100, zdir="z")

    plt.show()

if __name__ == "__main__":
    print(sys.argv)
    id = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    main(id)
