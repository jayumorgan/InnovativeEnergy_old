import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import mpl_toolkits.mplot3d.art3d as art3d
import matplotlib.animation as animation
import json
from matplotlib.patches import Circle
import sys

import numpy as np


def load_data(id):
    with open(f"../{id}data3d.json") as reader:
        return json.load(reader)


def generate_plots_for_path(data, ax):

    xs = []
    ys = []
    zs = []

    count = 0

    for d in data:

        # if count < 8:
        #     count += 1
        #     cont# inue
        if count % 2 == 50:
            pass
        else:
            if d == None:
                continue
            for point in d:
                x = point["x"]
                y = point["y"]
                z = point["z"]
                xs.append(x)
                ys.append(y)
                zs.append(z)

        count += 1
    return [xs, ys, zs]


if __name__ == "__main__":
    print(sys.argv)
    id = int(sys.argv[1]) if len(sys.argv) > 1 else 1

    print(f"Plotting coordinate for pallet configuration {id}")
    loaded = load_data(id)

    data = loaded["paths"]
    constraints = loaded["constraints"]

    fig = plt.figure()

    ax = fig.add_subplot(111, projection='3d')
    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Z')
    title = ax.set_title(f"Path plot for pallet_config_id = {id}")

    [xs, ys, zs] = generate_plots_for_path(data, ax)

    xs = np.array(xs)
    ys = np.array(ys)
    zs = np.array(list(map(lambda x: -1 * x, zs)))

    count = len(xs)

    print(xs)

    def update_graph(num):
        new_x = xs[0:num + 1]
        new_y = ys[0:num + 1]
        new_z = zs[0:num + 1]
        index = len(new_x) - 1
        if index >= 0:
            print(
                f"Coord: {num} (x = {new_x[index]}, y = {new_y[index]} z = {new_z[index] * -1})"
            )
        graph.set_data(new_x, new_y)
        graph.set_3d_properties(new_z)

        if num < len(constraints):
            add_constraint(num)

    time_interval = 200

    animation = animation.FuncAnimation(fig,
                                        update_graph,
                                        len(xs),
                                        interval=time_interval,
                                        blit=False,
                                        repeat=False)

    def add_constraint(num):
        c = constraints[num]
        x = c["x"]
        y = c["y"]
        z = c["z"]
        z *= -1  # reverse for top.
        r = c["radius"]
        p = Circle((x, y), r, alpha=0.5, fc="red", ec="black")
#        ax.add_patch(p)
#       art3d.pathpatch_2d_to_3d(p, z=z, zdir="z")

# p = Circle((100, 100), 100)
# ax.add_patch(p)
# art3d.pathpatch_2d_to_3d(p, z=100, zdir="z")

    graph, = ax.plot(xs, ys, zs)

    plt.show()
