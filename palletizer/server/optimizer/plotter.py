import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import matplotlib.animation as animation
import json
import sys

import numpy as np


def load_data(id):
    with open(f"../{id}data3d.json") as reader:
        return json.load(reader)


def generate_plots_for_path(data, ax):

    xs = []
    ys = []
    zs = []
    max_h = 0

    for d in data:
        for point in d:
            x = point["x"]
            y = point["y"]
            z = point["z"]
            xs.append(x)
            ys.append(y)
            zs.append(z)

    return [xs, ys, zs]


if __name__ == "__main__":
    print(sys.argv)
    id = int(sys.argv[1]) if len(sys.argv) > 1 else 1

    print(id)
    data = load_data(id)
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

    print("Plotting Path Coordinates")

    def update_graph(num):
        new_x = xs[0:num]
        new_y = ys[0:num]
        new_z = zs[0:num]
        index = len(new_x) - 1
        if index >= 0:
            print(
                f"Coord: {num} (x = {new_x[index]}, y = {new_y[index]} z = {new_z[index] * -1})"
            )
        graph.set_data(new_x, new_y)
        graph.set_3d_properties(new_z)

    time_interval = 200

    animation = animation.FuncAnimation(fig,
                                        update_graph,
                                        len(xs) + 1,
                                        interval=time_interval,
                                        blit=False,
                                        repeat=False)

    graph, = ax.plot(xs, ys, zs)

    plt.show()
