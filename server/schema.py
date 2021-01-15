class ValueType:
    NONE = 0
    NUMERIC = 1
    STRING = 2
    BOOLEAN = 3

def getTestSchemaItem():
    return [
        {
            "name": "foo1",
            "type": ValueType.NUMERIC,
            "isRequired": True,
            "defaultValue": 15,
            "isArray": False,
            "options": None,
            "validation": lambda v, obj: v < 20 and v > 10
        },
        {
            "name": "bar",
            "type": [
                {
                    "name": "subbar",
                    "type": ValueType.STRING,
                    "defaultValue": [ "first" ],
                    "isArray": True,
                    "options": [
                        {
                            "value": "first",
                            "name": "First"
                        },
                        {
                            "value": "second",
                            "name": "Second"
                        }
                    ],
                    "validation": lambda v, obj: len(v) < 3
                }
            ],
            "isRequired": True,
            "isArray": False,
            "options": None,
            "validation": lambda v, obj: v < 20 and v > 10
        },
    ]

def getTestSchemaData():
    return {
        "foo1": 18,
        "bar": {
            "subbar": [ "asd", "second" ]
        }
    }


class ValidationError:
    def __init__(self, path, error):
        self.path = path.copy()
        self.error = error

def validateAgainstSchema(schema, data, path=[]):
    errorList = []

    for schemaItem in schema:
        name = schemaItem["name"]
        valueType = schemaItem["type"]
        isRequired = schemaItem["isRequired"] if "isRequired" in schemaItem else False
        isArray = schemaItem["isArray"] if "isArray" in schemaItem else False
        options = schemaItem["options"] if "options" in schemaItem else False

        path.append(name)
        if not name in data:
            if isRequired:
                errorList.append(ValidationError(path, 'Value is required'))
        else:
            foundValue = data[name]

            # Type check
            if isinstance(valueType, list):
                if isArray:
                    for idx in range(len(foundValue)):
                        listItem = foundValue[idx]
                        path.append(idx)
                        (subsuccess, subErrorList) = validateAgainstSchema(valueType, listItem, path)
                        errorList.extend(subErrorList)
                        path.pop()
                else:
                    (subsuccess, subErrorList) = validateAgainstSchema(valueType, foundValue, path)
                    errorList.extend(subErrorList)
            elif type(valueType) == int:
                if isArray:
                    for idx in range(len(foundValue)):
                        listItem = foundValue[idx]
                        path.append(idx)
                        if valueType == ValueType.NUMERIC:
                            if type(listItem) != int and type(listItem) != float:
                                errorList.append(ValidationError(path, 'Value must be a numeric type'))
                        elif valueType == ValueType.STRING:
                            if type(listItem) != str:
                                errorList.append(ValidationError(path, 'Value must be a numeric type'))
                        elif valueType == ValueType.BOOLEAN:
                            if type(listItem) != bool:
                                errorList.append(ValidationError(path, 'Value must be a boolean type'))
                        path.pop()
                else:
                    if valueType == ValueType.NUMERIC:
                        if type(foundValue) != int and type(foundValue) != float:
                            errorList.append(ValidationError(path, 'Value must be a numeric type'))
                    elif valueType == ValueType.STRING:
                        if type(foundValue) != str:
                            errorList.append(ValidationError(path, 'Value must be a string type'))
                    elif valueType == ValueType.BOOLEAN:
                        if type(foundValue) != bool:
                            errorList.append(ValidationError(path, 'Value must be a boolean type'))
            else:
                # TODO: Log an error
                continue

            # Options Check
            if options != None:
                foundOption = False

                for option in options:
                    if option["value"] == foundValue:
                        foundOption = True
                        break

                if not foundOption:
                    errorList.append(ValidationError(path, 'Invalid option'))
                    continue

        path.pop()
            
    return (len(errorList) == 0, errorList)

def runTest():
    (success, errors) = validateAgainstSchema(getTestSchemaItem(), getTestSchemaData())
    print(success)