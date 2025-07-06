import asyncio
import json
from io import StringIO
from pyscript import window as js
from pyscript.ffi import create_proxy
import pandas as pd
from pandas.api.types import is_string_dtype
from pandas.api.types import is_numeric_dtype
from scipy.stats import mannwhitneyu, kruskal, anderson_ksamp, ks_2samp
import ProjectAssessmentForPyScript as pa
import warnings

workingData = pd.DataFrame()
cleanData = pd.DataFrame()

def attach_async(fn):
    cb = create_proxy(fn)
    
    def invoker(*args, **kw):
        p = js.Promise.withResolvers()
        cb(*args, **kw).add_done_callback(lambda _:p.resolve(_.result()))
        return p.promise

    return invoker


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
    df = pd.read_csv(csvStringIO, sep=",", header=None)
    return pd.Series(df.to_numpy().flatten().tolist()).to_json(orient='records')

async def calcMeansSDMW(*args):
    results = []
    r = []
    for arg in args:
        listData = json.loads(arg)
        s = pd.Series(listData)
        r.append(s)
        results.append([float(s.mean()), float(s.std()), int(s.count())])
    _, p = mannwhitneyu(*r) if len(r) == 2 else kruskal(*r) if len(r) > 2 else (None, None)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        anderson_result = anderson_ksamp(r).pvalue if len(r) > 1 else None
    ks_result = ks_2samp(*r).pvalue if len(r) == 2 else None
    return json.dumps(results), p, anderson_result, ks_result

async def checkCommSystem():
    js.clearErrorMessage()
    return True

js.startBootstrapWrapper = attach_async(startBootstrapWrapper)
js.buildTableWrapper = attach_async(buildTableWrapper)
js.calcMeansSDMW = attach_async(calcMeansSDMW)
js.passFileData = attach_async(passFileData)
js.getListData = attach_async(getListData)
js.checkCommSystem = attach_async(checkCommSystem)
