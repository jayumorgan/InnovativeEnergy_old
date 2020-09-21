# Palletizer
* `server/`: configuration handlers, palletizing & control engines, http server.
* `client/`: frontend.


# Testing Instructions
### Overview

For faster debugging and testing the palletizer should be run entirely on your laptop.

### Installation and Startup.

1. One directory level back from the desired location of the mm-applications repository clone the mm-js-api (https://github.com/VentionCo/mm-js-api) repository (so that it can be accessed from the mm-applications repository as ../mm-js-api). For more details, see the package.json files in pallerizer/server and pallerizer/client.

2. Clone the mm-applications repository.

3. Run `npm install` in the palletizer/server and pallerizer/client directories (may need `npm install -g typescript`).

4. Set desired environment variables in server/.env. Use the ENVIRONMENT=PRODUCTION flag if you want to control real machine motions (by using the ip addresses provided in the machine configuration) else, use DEVELOPMENT. For optimized paths use the flag PATH_TYPE=OPTIMIZED (else STANDARD). See server/engine/engine.ts for usage.

5. Set desired environment variables in client/.env. Use REACT_APP_ENVIRONMENT=DEVELOPMENT to use localhost (127.0.0.1) ip addresses to access machine motions. (For testing on machine, use PRODUCTION).

6. Run `npm start` in both folders.

### State of Affairs

Since demo day (the last time a full configuration and palletizing sequence has been created and tested), there have been significant changes to both the client and server that need to be tested. There are also a few remaining items (which can be found in the palletizer.org file).

The first priority should be to make sure that the engine (server/engine/engine.ts) is robust and will properly execute a palletizing sequence.

To do this, you will need to run through an entire machine and pallet configuration from the user interface (see server/dist/db/Configurations.sqlite3 to view these after save). As of right now, the rotational component of the jogger is discrete (0 | 90) so partial rotation (+ relative rotation of box and pallet) should be avoided (90 degrees should work fine).

The path optimizer has undergone somewhat extensive virtual testing (and not all known limititions have been dealt with) but it still not entirely production ready (details in palletizer.org). In particular, there are loops that may not converge. Also, it does not currently have a setting (which will be set in pallet configuration) for a lip height at pick location -- so if there is anything in the way of the box, it may get hit. It may also run into (pun intended) problems with downward motion.

It also will not entirely deal with constraints in downward motion, this should be sorted out soon.

You can plot the resulting optimized path by navigating to the server/optimizer and running either `python3 plotter.py 9` or `python3 action_plot 0`.

**If path optimization is a headache** change the environemnt variables and use that (see step 4 above).



