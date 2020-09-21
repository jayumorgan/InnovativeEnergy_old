#Plot continuous along path -- for well formed plot..

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


def flatten(d):
    pass


def generate_plots_for_path(data):
    xs = []
    ys = []
    zs = []
    actions = []
    for d in data:
        if d == None:
            continue
        for point in d:
            x = point["x"]
            y = point["y"]
            z = point["z"]
            action = point["action"]
            actions.append(action)
            xs.append(x)
            ys.append(y)
            zs.append(z)
    return [xs, ys, zs, actions]


def main(id):
    paths = load_data(id)["paths"]
    [xs, ys, zs, actions] = generate_plots_for_path(paths)
    xs = np.array(xs)
    ys = np.array(ys)
    zs = np.array(list(map(lambda x: -1 * x, zs)))

    fig = plt.figure()
    ax = fig.add_subplot(111, projection='3d')
    title = ax.set_title(f"Path plot for pallet_config_id = {id}")
    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Z')

    graph, = ax.plot(xs, ys, zs)

    def update_graph(n):
        if n <= len(xs):
            graph.set_data(xs[0:n], ys[0:n])
            graph.set_3d_properties(zs[0:n])
            if n < len(actions):
                if actions[n] != 0:
                    color = "r" if actions[n] > 1 else "g"
                    x = xs[n]
                    y = ys[n]
                    z = zs[n]
                    print(x, y, z)
                    ax.plot([x], [y], [z],
                            markerfacecolor=color,
                            markeredgecolor=color,
                            marker='o',
                            markersize=7,
                            alpha=1)

    time_interval = 200
    animator = animation.FuncAnimation(fig,
                                       update_graph,
                                       len(xs) + 1,
                                       interval=time_interval,
                                       blit=False,
                                       repeat=False)

    plt.show()


if __name__ == "__main__":
    print(sys.argv)
    id = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    main(id)
