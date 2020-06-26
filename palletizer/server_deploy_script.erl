-module(server_deploy_script).
-export([build/0]).

valid_dir("node_modules") ->
    not_valid;
valid_dir("src") ->
    not_valid;
valid_dir("__pycache__") -> 
    not_valid;
valid_dir(_) ->
    valid.

handle_dir(Path, File) ->
    DirPath = Path ++ File,
    io:fwrite("Directory: ~s ~n", [DirPath]),
    Valid = valid_dir(File),
    if Valid == valid ->
        {ok, Files} = file:list_dir(DirPath),
        lists:map(fun(F) ->
                          parse_file(DirPath ++ "/", F) end, Files);
       true ->
            not_valid end.

parse_file(Path,File) ->
    FilePath = Path ++ File,
    io:fwrite("parsing file: ~s ~n", [FilePath]),
    Isdir = filelib:is_dir(FilePath),
    if Isdir ->
            handle_dir(Path, File);
    true ->
        filelib:ensure_dir("deploy/" ++ Path),
        io:fwrite("copying file: ~s ~n", [FilePath]),
        file:copy(FilePath, "deploy/" ++ FilePath)
    end.

build() ->
    Rem = os:cmd("rm -rf build/"),
    TScompile = os:cmd("cd server/ && tsc"),
    Reactbuild = os:cmd("cd server/client && npm run build"),
    io:fwrite("Remove = ~s, TScompile = ~s, React build = ~s ~n", [Rem, TScompile, Reactbuild]),
    Path = "server",
    handle_dir(Path, ""),
    Machine = "machine",
    handle_dir(Machine, "").
