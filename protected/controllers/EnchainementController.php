<?php

class EnchainementController extends Controller
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
			$enchainement = Enchainement::model()->findByPk(Yii::app()->request->getParam('id'));
			if(Yii::app()->user->getId() === $enchainement->userCreate_id) {
				$owner = Yii::app()->user->name;				
			}
		}
		return array(
			array('allow',  // allow all users to perform 'index' and 'view' actions
				'actions'=>array('index','view','getLinkedLessons','getNextPasses', 'getNextPassesWithAlternative'),
				'users'=>array('*'),
			),
			array('allow', // allow authenticated user to perform 'create' and 'update' actions
				'actions'=>array('create','setFavoris', 'unsetFavoris'),
				'users'=>array('@'),
			),
			array('allow', // allow owner user to perform 'update'
				'actions'=>array('update'),
				'users'=>array($owner,'admin'),
			),
			array('allow', // allow admin user to perform 'admin' and 'delete' actions
				'actions'=>array('admin','delete'),
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
		$model=new Enchainement;

		// Uncomment the following line if AJAX validation is needed
		// $this->performAjaxValidation($model);

		if(isset($_POST['Enchainement']))
		{			
			$model->attributes=$_POST['Enchainement'];			
			$model->userCreate_id=Yii::app()->user->id;
			$model->dateCreate=date('Y-m-d');
			$model->dateMaj=date('Y-m-d');
			if ($model->lesson_id == null){
				$model->dateEvent=null;					
			}			
			if ($model->lesson->private == 1){
				$model->private = 1;
			}
			if($model->save())
				if(isset($_POST['enchainementPasses_id'])){
					$this->savePasses($model, $_POST['enchainementPasses_id']);
				}
				$email = Yii::app()->email;
				$email->from = 'admin@passe-finder.com';
				$email->to = 'passefinder@gmail.com';
				$email->subject = 'Nouvel Enchainement créé par '.Yii::app()->user->username;
				$email->message = "<a href='http://www.passe-finder.fr/index.php/enchainement/".$model->id."'>Lien vers le nouvel enchainement</a>";
				$email->send();
				
				$this->redirect(array('view','id'=>$model->id));
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

		if(isset($_POST['Enchainement']))
		{
			$model->attributes=$_POST['Enchainement'];
			if ($model->lesson_id == null){
				$model->dateEvent=null;					
			}	
			if ($model->lesson->private == 1){
				$model->private = 1;
			}
			$model->dateMaj=date('Y-m-d');
			
			if(isset($_POST['enchainementPasses_id'])){
				$command = Yii::app()->db->createCommand();
				$command->delete('enchainement_passe', 'enchainement_id=:id', array(':id'=>$model->id));
				$this->savePasses($model, $_POST['enchainementPasses_id']);
			}
			
			if($model->save())
				$this->redirect(array('view','id'=>$model->id));
		}

		$this->render('update',array(
			'model'=>$model,
		));
	}
	
	public function savePasses($model, $passes){
		$array = explode(",",$passes);
		$i=0;
		foreach($array as $passe){
			$i++;
			$enchainementPasse=new EnchainementPasse;
			$enchainementPasse->enchainement_id = $model->id;
			if (strpos($passe,'a') === false){
				$enchainementPasse->passe_id = $passe;
			} else {
				$enchainementPasse->position_id = substr($passe,1);
			}			
			$enchainementPasse->order = $i;
			$enchainementPasse->save();
		}
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
			$this->loadModel($id)->delete();

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
	public function actionIndex($search = '', $withOrWithoutVideo= 'both')
	{
		$criteria = new CDbCriteria();
		
		if ($withOrWithoutVideo == 'with') {
			$criteria->addCondition('video.id IS NOT NULL', 'AND');

		}
		else if ($withOrWithoutVideo == 'without') {
			$criteria->addCondition('video.id IS NULL', 'AND');
		}
		$criteria->distinct = true;
		$criteria->addSearchCondition('t.name', $search, true, 'AND');	
		$criteria->join='LEFT join user_lesson on user_lesson.lesson_id=t.lesson_id LEFT join video on video.enchainement_id=t.id';
		$criteria->addCondition('t.userCreate_id='.Yii::app()->user->id.' or (published=1 and t.private=0) or (t.private=1 and user_lesson.user_id='.Yii::app()->user->id.')', 'AND');	
		
		$dataProvider=new CActiveDataProvider('Enchainement', array(
			'criteria'=>$criteria
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
		$model=new Enchainement('search');
		$model->unsetAttributes();  // clear any default values
		if(isset($_GET['Enchainement']))
			$model->attributes=$_GET['Enchainement'];

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
		$model=Enchainement::model()->findByPk($id);
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
		if(isset($_POST['ajax']) && $_POST['ajax']==='enchainement-form')
		{
			echo CActiveForm::validate($model);
			Yii::app()->end();
		}
	}
	
	public function actionGetLinkedLessons()
	{		
		$data=Lesson::model()->findAll('school_id=:parent_id', array(':parent_id'=>(int) $_POST['school_id']));	 
		$data=CHtml::listData($data,'id','name');
		foreach($data as $value=>$name)
		{
			echo CHtml::tag('option',  array('value'=>$value),CHtml::encode($name),true);
		}		
	}
	
	public function actionGetNextPasses()
	{				
		$passe=Passe::model()->findByPk((int)$_POST['idPasse']);
		
		$data=Passe::model()->findAll('positionStart_id=:position_id and pending=0', array(':position_id'=>(int) $passe->positionEnd_id));	 
		$dropDownPasses = $this->buildDropdownPasses($data);
		
		$data=Alternative::model()->findAll('positionStart_id=:position_id', array(':position_id'=>(int) $passe->positionEnd_id));	 
		$dropDownAlternatives = $this->buildDropdownAlternatives($data);

		echo CJSON::encode(array(
            'dropDownPasses'=>$dropDownPasses,
            'dropDownAlternatives'=>$dropDownAlternatives,
			'newpasse'=>$passe
        ));		
	}
	
	public function actionGetNextPassesWithAlternative()
	{		
		$position=Position::model()->findByPk((int)$_POST['idPosition']);
		
		$data=Passe::model()->findAll('positionStart_id=:position_id and pending=0', array(':position_id'=>(int) $position->id));	 
		$dropDownPasses = $this->buildDropdownPasses($data);		

		echo CJSON::encode(array(
            'dropDownPasses'=>$dropDownPasses,
            'newposition'=>$position
        ));		
	}
	
	private function buildDropdownPasses($data){
		$data=CHtml::listData($data,'id','name');
		$dropDownPasses = "<option value=''>Sélectionnez une passe</option>";
		foreach($data as $value=>$name)
		{
			$dropDownPasses .= CHtml::tag('option',  array('value'=>$value),CHtml::encode($name),true);
		}	
		return $dropDownPasses;
	}
	
	private function buildDropdownAlternatives($data){
		$data=CHtml::listData($data,'positionAlternative_id','positionAlternative.name');
		$dropDownAlternatives = "<option value=''>Sélectionnez une alternative</option>";
		foreach($data as $value=>$name)
		{
			$dropDownAlternatives .= CHtml::tag('option',  array('value'=>$value),CHtml::encode($name),true);
		}	
		return $dropDownAlternatives;
	}
	
	public function actionSetFavoris($id){
		$model=$this->loadModel($id);
		
		$favoris = new EnchainementFavoris;
		$favoris->enchainement_id = $model->id;
		$favoris->user_id = Yii::app()->user->id;
		$favoris->save();
		$this->redirect(array('view','id'=>$model->id));
	}
	
	public function actionUnsetFavoris($id){
		$model=$this->loadModel($id);
		
		$favoris = EnchainementFavoris::model()->findByAttributes(array('user_id'=>Yii::app()->user->id,'enchainement_id'=>$model->id));
		$favoris->delete();
		$this->redirect(array('view','id'=>$model->id));
	}
}
