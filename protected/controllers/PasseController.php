<?php

class PasseController extends Controller
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
			$passe = Passe::model()->findByPk(Yii::app()->request->getParam('id'));
			if(Yii::app()->user->getId() === $passe->userCreate_id) {
				$owner = Yii::app()->user->name;				
			}
		}
		return array(
			array('allow',  // allow all users to perform 'index' and 'view' actions
				'actions'=>array('index','view'),
				'users'=>array('*'),
			),
			array('allow', // allow authenticated user to perform 'create' and 'update' actions
				'actions'=>array('create', 'setFavoris', 'unsetFavoris', 'personnalizeName', 'unsetPersonnalize', 'dynamicPasses'),
				'users'=>array('@'),
			),
			array('allow', // allow owner user to perform 'update'
				'actions'=>array('update', 'delete'),
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
        $model=new Passe;

		// Uncomment the following line if AJAX validation is needed
		$this->performAjaxValidation($model);

		if(isset($_POST['Passe']))
		{
			$model->attributes=$_POST['Passe'];
			$model->dateCreate=date('Y-m-d');
			$model->dateMaj=date('Y-m-d');
			$model->userCreate_id=Yii::app()->user->id;
			$model->pending=1;
			if($model->save()){
				$email = Yii::app()->email;
				$email->from = 'admin@passe-finder.com';
				$email->to = 'passefinder@gmail.com';
				$email->subject = 'Nouvelle Passe créé par '.Yii::app()->user->username;
				$email->message = "<a href='http://www.passe-finder.fr/index.php/passe/".$model->id."'>Lien vers la nouvelle passe</a>";
				$email->send();
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

		if(isset($_POST['Passe']))
		{
			$model->attributes=$_POST['Passe'];
			if($model->save())
				$this->redirect(array('view','id'=>$model->id));
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
			$passe = $this->loadModel($id);
			if ($passe->enchainementsCount > 0){
				throw new CHttpException(403,'Cette passe est déjà utilisée, impossible de supprimer');
			} else {
				$passe->delete();
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
	public function actionIndex($search = ''){
		
		$criteria = new CDbCriteria();
		$criteria->addSearchCondition('name', $search, true, 'OR');
		$criteria->addCondition('(published=1 and pending=0) or userCreate_id='.Yii::app()->user->id);
		$dataProvider=new CActiveDataProvider('Passe', array(
			'criteria'=>$criteria,
		));
		$this->render('index',array(
			'dataProvider'=>$dataProvider,
		));
	}

	/**
	 * Manages all models.
	 */
	public function actionAdmin()
	{
		$model=new Passe('search');
		$model->unsetAttributes();  // clear any default values
		if(isset($_GET['Passe']))
			$model->attributes=$_GET['Passe'];

		$this->render('admin',array(
			'model'=>$model,
		));
	}
	
	public function actionValid($id)
	{
		$model = $this->loadModel($id);
		$model->pending = 0;
		if($model->save()){
			$model=new Passe('search');
			$model->unsetAttributes(); 
			$this->render('admin',array(
				'model'=>$model,
			));
		}
	}

	/**
	 * Returns the data model based on the primary key given in the GET variable.
	 * If the data model is not found, an HTTP exception will be raised.
	 * @param integer the ID of the model to be loaded
	 */
	public function loadModel($id)
	{
		$model=Passe::model()->findByPk($id);
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
		if(isset($_POST['ajax']) && $_POST['ajax']==='passe-form')
		{
			echo CActiveForm::validate($model);
			Yii::app()->end();
		}
	}
	
	public function actionSetFavoris($id){
		$model=$this->loadModel($id);
		
		$favoris = new FavorisPasse;
		$favoris->passe_id = $model->id;
		$favoris->user_id = Yii::app()->user->id;
		$favoris->save();
		$this->redirect(array('view','id'=>$model->id));
	}
	
	public function actionUnsetFavoris($id){
		$model=$this->loadModel($id);
		
		$favoris = FavorisPasse::model()->findByAttributes(array('user_id'=>Yii::app()->user->id,'passe_id'=>$model->id));
		$favoris->delete();
		$this->redirect(array('view','id'=>$model->id));
	}
	
	public function actionPersonnalizeName(){
		if(isset($_POST['value']))
		{
			$personnalize = PersonnalizePasse::model()->findByAttributes(array('user_id'=>Yii::app()->user->id,'passe_id'=>$_POST['pk']));
			if ($personnalize == null){
				$personnalize = new PersonnalizePasse;
			}
			$personnalize->passe_id = $_POST['pk'];
			$personnalize->user_id = Yii::app()->user->id;
			$personnalize->name = $_POST['value'];

			$personnalize->save();
		}
	}
	
	public function actionUnsetPersonnalize($id){
		$personnalize = PersonnalizePasse::model()->findByAttributes(array('user_id'=>Yii::app()->user->id,'passe_id'=>$id));
		if ($personnalize != null){
			$personnalize->delete();
		}
		$this->redirect(array('view','id'=>$id));
	}  

    public function actionDynamicPasses(){
        $data=Passe::model()->findAll('danse_id=:danse_id', 
                      array(':danse_id'=>(int) $_POST['danse_id']));
     
        $data=CHtml::listData($data,'id','name');
        echo CHtml::tag('option',
            array('value'=>0),'Choisir une passe...',true);
        foreach($data as $value=>$name)
        {
            echo CHtml::tag('option',
                       array('value'=>$value),CHtml::encode($name),true);
        }
    }    
}
