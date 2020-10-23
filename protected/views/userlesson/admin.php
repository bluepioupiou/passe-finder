<?php
$this->breadcrumbs=array(
	'Gérer vos élèves',
);

$this->menu=array(
	array('label'=>'List UserLesson', 'url'=>array('index')),
	array('label'=>'Create UserLesson', 'url'=>array('create')),
);

?>

<h1>Gérer vos élèves</h1>



<?php $this->widget('zii.widgets.grid.CGridView', array(
	'id'=>'user-lesson-grid',
	'dataProvider'=>new CActiveDataProvider('UserLesson',array(
		'criteria'=>array(
			'condition'=>'lesson.userTeacher_id='.Yii::app()->user->id,
			'order'=>'pending DESC',
			'with'=>'lesson'
		)
	)),
	'columns'=>array(
		array('name'=>'lesson_id','value'=>'$data->lesson->name'),
		array('name'=>'user_id','value'=>'$data->userStudent->username'),
		array('name'=>'pending','value'=>'Yii::t("boolean",$data->pending)'),
		array(
			'class'=>'CButtonColumn',
			'template'=>'{valid}{delete}',
			'buttons'=>array(			
				'valid' => array
				(
					'label'=>'Valider la demande d\'inscription',
					'imageUrl'=>Yii::app()->request->baseUrl.'/images/tick.png',
					'url'=>'Yii::app()->createUrl("userlesson/valid", array("id"=>$data->id))',
					'visible'=>'$data->pending'
				)
			),
		),
	),
)); ?>
