import asyncio
import json
from io import StringIO
from pyscript import window as js
import pandas as pd
from pandas.api.types import is_string_dtype
from pandas.api.types import is_numeric_dtype
from scipy.stats import mannwhitneyu
import ProjectAssessmentForPyScript as pa

workingData = pd.DataFrame()
cleanData = pd.DataFrame()

async def passFileData(data):
    global workingData
    numericColumns = []
    textColumns = []
    if len(data) > 0:
        csvStringIO = StringIO(data)
        df = pd.read_csv(csvStringIO, sep=",")
        for col in df.columns:
            if is_string_dtype(df[col]):
                textColumns.append(col)
            elif is_numeric_dtype(df[col]):
                numericColumns.append(col)
        workingData = df
    await asyncio.sleep(0)
    js.populateColForm(json.dumps(numericColumns), json.dumps(textColumns))

async def updateJS(i, n):
    r = js.updateBootstrap(i, n)
    if r is True:
        return True
    return None

async def buildTable(colList):
    global workingData
    global cleanData
    if len(colList) == 4:
        kVals = workingData.loc[:,colList[0]].to_list()
        boundVals = workingData.loc[:,colList[1]].to_list()
        studentVals = workingData.loc[:,colList[2]].to_list()
        rubricVals = workingData.loc[:,colList[3]].to_list()
        d = {
            'k': kVals,
            'bound': boundVals,
            'student': studentVals,
            'rubric': rubricVals
        }
        df = pd.DataFrame(data=d)
        cleanData = df
        try:
            rubricR, studentR, _, _, obs, param, AIC, BIC, McFadden, LR, ChiSquared, LogLikelihood  = await pa.getResults(df, func=updateJS, n=0)
        except:
            return None
        await asyncio.sleep(0)
        js.showErrorMessage()
        js.paintAfterEst(rubricR.to_json(orient='records'), studentR.to_json(orient='records'), obs, param, AIC, BIC, McFadden, LR, ChiSquared, LogLikelihood)
        js.clearErrorMessage()
        return True
    return None

async def buildTableWrapper(colListS):
    colList = json.loads(colListS)
    return await buildTable(colList)

async def startBootstrap():
    global cleanData
    if not cleanData.empty:
        try:
            bootstrapResults = await pa.getResults(cleanData, func=updateJS)
            if bootstrapResults is None:
                return None
            rubricR, _, bootstrap, errors, _, _, _, _, _, _, _, _ = bootstrapResults
        except:
            return None
        printedRubric = rubricR.merge(bootstrap, on='Variable', how='left').to_json(orient='records')
        await asyncio.sleep(0)
        js.showErrorMessage()
        js.paintAfterBootstrap(printedRubric, errors)
        js.clearErrorMessage()
        return True
    return None

async def startBootstrapWrapper():
    return await startBootstrap()

async def getListData(data):
    if len(data) == 0:
        return json.dumps([])
    csvStringIO = StringIO(data)
    df = pd.read_csv(csvStringIO, sep=",")
    return pd.Series(df.to_numpy().flatten().tolist()).to_json(orient='records')

async def calcMeansSDMW(listOneS, listTwoS):
    listOne = json.loads(listOneS)
    listTwo = json.loads(listTwoS)
    s1 = pd.Series(listOne)
    if len(listTwo) == 0:
        return json.dumps([float(s1.mean()), float(s1.std()), int(s1.count())])
    s2 = pd.Series(listTwo)
    _, p = mannwhitneyu(s1, s2)
    return json.dumps([float(s1.mean()), float(s1.std()), int(s1.count()), float(s2.mean()), float(s2.std()), int(s2.count()), float(p)])

async def checkCommSystem():
    js.clearErrorMessage()
    return True

js.startBootstrapWrapper = startBootstrapWrapper
js.buildTableWrapper = buildTableWrapper
js.calcMeansSDMW = calcMeansSDMW
js.passFileData = passFileData
js.getListData = getListData
js.checkCommSystem = checkCommSystem
