using SQLite
using DBInterface
using JSON


#---------------Data---------------
struct Coordinate
    x::Float64
    y::Float64
    z::Float64
    θ::Float64
end

struct BoxCoordinate
    linearPathDistance::Float64
    dropLocation::Coordinate
end

# Julia is not very good actually.
function loadDatabase()
    # a = db.execute("SELECT * from pallet_configs;")
    # print(a)'
    dbfile = "../server/dist/db/Configurations.sqlite3"
    db = SQLite.DB(dbfile)
    println(SQLite.tables(db))
    return db
end

function parseCoordinate(c)
    return Coordinate(c["x"], c["y"], c["z"], c["θ"])
end

function getBoxCoordinatesConfigById(id)
    db = loadDatabase()
    results = DBInterface.execute(db, "SELECT * FROM pallet_configs WHERE id = $(id);")
    json = ""
    for row in results
        @show propertynames(row) # see possible column names of row results
        json = row.raw_json 
        break
    end
    config = JSON.parse(json)
    coordinates = config["boxCoordinates"]
    output = []
   
    for boxCoordinate in coordinates
        bc = BoxCoordinate(boxCoordinate["linearPathDistance"], parseCoordinate(boxCoordinate["dropLocation"]))
        push!(output, bc)
    end

    output = sort(output, by=getDistance, rev=true)
    return output
end

function getDistance(c)
    return c.linearPathDistance
end

function main()
    boxCoordinates = getBoxCoordinatesConfigById(1)
    println(boxCoordinates) 
end




main()





