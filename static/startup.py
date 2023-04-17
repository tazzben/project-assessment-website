from js import updateBootstrap, populateColForm
import pandas as pd
from io import StringIO
import ProjectAssessmentForPyScript as pa
from pandas.api.types import is_string_dtype
from pandas.api.types import is_numeric_dtype
from scipy.stats import mannwhitneyu
import json
import asyncio

workingData = pd.DataFrame()
cleanData = pd.DataFrame()

def passFileData(data):
    global workingData
    numericColumns = []
    textColumns = []
    csvStringIO = StringIO(data)
    df = pd.read_csv(csvStringIO, sep=",")
    for col in df.columns:
        if is_string_dtype(df[col]):
            textColumns.append(col)
        elif is_numeric_dtype(df[col]):
            numericColumns.append(col)
    workingData = df
    populateColForm(json.dumps(numericColumns), json.dumps(textColumns))

def updateJS(i, n):
    updateBootstrap(i, n)

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
            rubricR, studentR, _, _, obs, param, AIC, BIC, McFadden, LR, ChiSquared, LogLikelihood  = pa.getResults(df, func=updateJS, n=0)
        except:
            return None
        return rubricR.to_json(orient='records'), studentR.to_json(orient='records'), obs, param, AIC, BIC, McFadden, LR, ChiSquared, LogLikelihood
    return None

async def startBootstrap():
    global cleanData
    if not cleanData.empty:
        try:
            rubricR, _, bootstrap, errors, _, _, _, _, _, _ = pa.getResults(cleanData, func=updateJS)
        except:
            return None
        printedRubric = rubricR.merge(bootstrap, on='Variable', how='left')
        return printedRubric.to_json(orient='records'), errors
    return None

def getListData(data):
    csvStringIO = StringIO(data)
    df = pd.read_csv(csvStringIO, sep=",")
    return json.dumps(df.to_numpy().flatten().tolist())

async def calcMeansSDMW(listOne, listTwo):
    s1 = pd.Series(listOne)
    if len(listTwo) == 0:
        return s1.mean(), s1.std()
    s2 = pd.Series(listTwo)
    _, p = mannwhitneyu(s1, s2)
    return s1.mean(), s1.std(), s2.mean(), s2.std(), p