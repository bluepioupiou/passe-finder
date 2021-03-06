<?php

class PositionController extends Controller
{
	/**
	 * @var string the default layout for the views. Defaults to '//layouts/column2', meaning
	 * using two-column layout. See 'protected/views/layouts/column2.php'.
	 */
	public $layout='//layouts/column1';

	/**
	 * @return array action filters
	 */
	public function filters()
	{
		return array(
			'accessControl', // perform access control for CRUD operations
		);
	}

	/**
	 * Specifies the access control rules.
	 * This method is used by the 'accessControl' filter.
	 * @return array access control rules
	 */
	public function accessRules()
	{	
		$owner='';
		if (Yii::app()->request->getParam('id')){
			$position = Position::model()->findByPk(Yii::app()->request->getParam('id'));
			if(Yii::app()->user->getId() === $position->userCreate_id) {
				$owner = Yii::app()->user->name;				
			}
		}
		return array(			
			array('allow',  // allow all users to perform 'index' and 'view' actions
				'actions'=>array('index','view'),
				'users'=>array('*'),
			),
			array('allow', // allow authenticated user to perform 'create' 
				'actions'=>array('create', 'dynamicPositions'),
				'users'=>array('@'),
			),
			array('allow', // allow owner user to perform 'update'
				'actions'=>array('update','delete'),
				'users'=>array($owner),
			),
			array('allow', // allow admin user to perform 'admin' and 'delete' actions
				'actions'=>array('admin','delete', 'valid'),
				'expression'=>'Yii::app()->user->isAdmin()',
			),
			array('deny',  // deny all users
				'users'=>array('*'),
			),
		);
	}

	/**
	 * Displays a particular model.
	 * @param integer $id the ID of the model to be displayed
	 */
	public function actionView($id)
	{
		$this->layout = '//layouts/column2';
		$this->render('view',array(
			'model'=>$this->loadModel($id),
		));
	}

	/**
	 * Creates a new model.
	 * If creation is successful, the browser will be redirected to the 'view' page.
	 */
	public function actionCreate()
	{
		date_default_timezone_set("Europe/Paris");
        $model=new Position;

		// Uncomment the following line if AJAX validation is needed
		// $this->performAjaxValidation($model);

		if(isset($_POST['Position']))
		{
			$model->attributes = $_POST['Position'];
			$model->image_file = CUploadedFile::getInstance($model,'image_file');
			$model->image = $model->image_file->name;
			$model->dateCreate=date('Y-m-d');
			$model->dateMaj=date('Y-m-d');
			$model->userCreate_id=Yii::app()->user->id;				
			
			if($model->save()){
				$email = Yii::app()->email;
				$email->from = 'admin@passe-finder.com';
				$email->to = 'passefinder@gmail.com';
				$email->subject = 'Nouvelle Position cree par '.Yii::app()->user->username;
				$email->message = "<a href='http://www.passe-finder.fr/index.php/position/".$model->id."'>Lien vers la nouvelle position</a>";
				$email->send();
                $model->image_file->saveAs(Yii::app()->basePath."/../images/positions/position_".$model->id.".jpg");
				$this->redirect(array('view','id'=>$model->id));
			}
		}

		$this->render('create',array(
			'model'=>$model,
		));
	}

	/**
	 * Updates a particular model.
	 * If update is successful, the browser will be redirected to the 'view' page.
	 * @param integer $id the ID of the model to be updated
	 */
	public function actionUpdate($id)
	{
		$model=$this->loadModel($id);

		// Uncomment the following line if AJAX validation is needed
		// $this->performAjaxValidation($model);

		if(isset($_POST['Position'])){
			$model->attributes=$_POST['Position'];
			$model->image_file = CUploadedFile::getInstance($model,'image_file');
			if ($model->image_file != null){
				$model->image = $model->image_file->name;				
				$model->image_file->saveAs(Yii::app()->basePath."/../images/positions/position_".$model->id.".jpg");
			}
			if($model->save()){
				$this->redirect(array('view','id'=>$model->id));
			}
		}

		$this->render('update',array(
			'model'=>$model,
		));
	}

	/**
	 * Deletes a particular model.
	 * If deletion is successful, the browser will be redirected to the 'admin' page.
	 * @param integer $id the ID of the model to be deleted
	 */
	public function actionDelete($id)
	{
		if(Yii::app()->request->isPostRequest)
		{
			// we only allow deletion via POST request
			$position = $this->loadModel($id);
			if ($position->passesStartCount > 0 or $position->passesEndCount > 0 or $position->alternativesStartCount > 0){
				throw new CHttpException(403,'Cette position est déjà utilisée, impossible de supprimer');
			} else {
				$position->delete();
			}
			// if AJAX request (triggered by deletion via admin grid view), we should not redirect the browser
			if(!isset($_GET['ajax']))
				$this->redirect(isset($_POST['returnUrl']) ? $_POST['returnUrl'] : array('index'));
		}
		else
			throw new CHttpException(400,'Invalid request. Please do not repeat this request again.');
	}

	/**
	 * Lists all models.
	 */
	public function actionIndex($search = '')
	{
		
		$criteria = new CDbCriteria();
		$criteria->addSearchCondition('name', $search, true, 'OR');
		$criteria->addCondition('pending=0 or userCreate_id='.Yii::app()->user->id);
		
		$dataProvider=new CActiveDataProvider('Position', array(
			'criteria'=>$criteria,
        ));
		
		$this->render('index',array(
			'dataProvider'=>$dataProvider
		));
	}

	/**
	 * Manages all models.
	 */
	public function actionAdmin()
	{
		$model=new Position('search');
		$model->unsetAttributes();  // clear any default values
		if(isset($_GET['Position']))
			$model->attributes=$_GET['Position'];

		$this->render('admin',array(
			'model'=>$model,
		));
	}

	/**
	 * Returns the data model based on the primary key given in the GET variable.
	 * If the data model is not found, an HTTP exception will be raised.
	 * @param integer the ID of the model to be loaded
	 */
	public function loadModel($id)
	{
		$model=Position::model()->findByPk($id);
		if($model===null)
			throw new CHttpException(404,'The requested page does not exist.');
		return $model;
	}

	/**
	 * Performs the AJAX validation.
	 * @param CModel the model to be validated
	 */
	protected function performAjaxValidation($model)
	{
		if(isset($_POST['ajax']) && $_POST['ajax']==='position-form')
		{
			echo CActiveForm::validate($model);
			Yii::app()->end();
		}
	}
	
	public function actionValid($id)
	{
		$model = $this->loadModel($id);
		$model->pending = 0;
		if($model->save()){
			$model=new Position('search');
			$model->unsetAttributes(); 
			$this->render('admin',array(
				'model'=>$model,
			));
		}
	}
    
    public function actionDynamicPositions(){
        $data=Position::model()->findAll('danse_id=:danse_id', 
                      array(':danse_id'=>(int) $_POST['Passe']['danse_id']));
     
        $data=CHtml::listData($data,'id','name');
        foreach($data as $value=>$name)
        {
            echo CHtml::tag('option',
                       array('value'=>$value),CHtml::encode($name),true);
        }
    }
}
